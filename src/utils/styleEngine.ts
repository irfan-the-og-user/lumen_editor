import type { StylePreset } from '../types';

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neo-Tokyo',
    description: 'Electric cyan-magenta color split with heightened contrast and neon bloom',
    category: 'cinematic',
    prompt: 'cyberpunk neon lighting, synthwave chromatic tones, 8k hyper-detailed',
    color: '#06b6d4',
    previewUrl: 'linear-gradient(135deg, #06b6d4 0%, #d946ef 100%)'
  },
  {
    id: 'monochrome',
    name: 'Editorial Monochrome',
    description: 'High-contrast Swiss fine-art black and white with deep shadows and film grain',
    category: 'artistic',
    prompt: 'black and white fine art photography, high contrast, Leica M11 monochrome',
    color: '#f4f4f5',
    previewUrl: 'linear-gradient(135deg, #18181b 0%, #71717a 50%, #f4f4f5 100%)'
  },
  {
    id: 'oil-painting',
    name: 'Renaissance Oil Canvas',
    description: 'Kuwahara painterly stroke smoothing with warm golden chiaroscuro tones',
    category: 'artistic',
    prompt: 'oil painting on textured canvas, masterpiece, rich brush strokes, classical art',
    color: '#f59e0b',
    previewUrl: 'linear-gradient(135deg, #78350f 0%, #d97706 50%, #fde68a 100%)'
  },
  {
    id: 'anime-ghibli',
    name: 'Studio Anime Glow',
    description: 'Vibrant animated watercolor palette with luminous sky gradients and crisp lines',
    category: 'render',
    prompt: 'Studio Ghibli aesthetic, anime illustration, makoto shinkai lighting, vibrant',
    color: '#10b981',
    previewUrl: 'linear-gradient(135deg, #059669 0%, #34d399 50%, #67e8f9 100%)'
  },
  {
    id: 'vintage-film',
    name: 'Kodachrome 1970',
    description: 'Warm analog film response curve, subtle halation, and retro saturation balance',
    category: 'retro',
    prompt: '35mm vintage Kodachrome photograph, analog warmth, nostalgic 1970s film aesthetic',
    color: '#f97316',
    previewUrl: 'linear-gradient(135deg, #c2410c 0%, #fb923c 50%, #fef08a 100%)'
  },
  {
    id: 'blueprint',
    name: 'Architectural Blueprint',
    description: 'Precision Prussian blue drafting paper with structural white contour linework',
    category: 'render',
    prompt: 'architectural technical blueprint, white line schematic on Prussian cyan background',
    color: '#38bdf8',
    previewUrl: 'linear-gradient(135deg, #082f49 0%, #0369a1 50%, #38bdf8 100%)'
  }
];

export interface StyleTransferResult {
  resultDataUrl: string;
  engineUsed: 'huggingface' | 'edge-client' | 'async-queue';
  latencyMs: number;
}

import { executeWorkerStylePreview } from './previewWorkerClient';

/**
 * Executes Style Transfer via Web Worker preview and Async Server Job Queue
 */
export const executeStyleTransfer = async (
  imageSrc: string,
  styleId: string,
  hfApiKey?: string,
  onProgress?: (step: string, percentage: number) => void
): Promise<StyleTransferResult> => {
  const startTime = performance.now();

  const preset = STYLE_PRESETS.find((p) => p.id === styleId);
  if (!preset) throw new Error('Unknown style preset selected.');

  // 1. Instant Web Worker local preview (<100ms)
  onProgress?.('Generating instant Web Worker local downscaled preview...', 10);
  const localPreview = await executeWorkerStylePreview(imageSrc, styleId);
  onProgress?.('Local Web Worker preview ready.', 25);

  // 2. Offload full-resolution task to Async Server Job Queue
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (hfApiKey && hfApiKey.trim().length > 5) {
      headers['Authorization'] = `Bearer ${hfApiKey.trim()}`;
    }

    const createRes = await fetch('/api/jobs/create', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        type: 'style',
        image: imageSrc,
        styleId,
        stylePrompt: preset.prompt
      })
    });

    if (createRes.ok) {
      const { jobId } = await createRes.json();

      return await new Promise<StyleTransferResult>((resolve) => {
        const eventSource = new EventSource(`/api/jobs/stream?jobId=${jobId}`);

        eventSource.onmessage = async (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.step && data.progress !== undefined) {
              onProgress?.(data.step, data.progress);
            }

            if (data.status === 'completed') {
              eventSource.close();
              const resultRes = await fetch(`/api/jobs/result?jobId=${jobId}`);
              if (resultRes.ok) {
                const blob = await resultRes.blob();
                const resultDataUrl = URL.createObjectURL(blob);
                resolve({
                  resultDataUrl,
                  engineUsed: 'async-queue',
                  latencyMs: Math.round(performance.now() - startTime)
                });
              } else {
                resolve({
                  resultDataUrl: localPreview.resultDataUrl,
                  engineUsed: 'edge-client',
                  latencyMs: Math.round(performance.now() - startTime)
                });
              }
            } else if (data.status === 'failed') {
              eventSource.close();
              console.warn('Async job queue failed:', data.error);
              resolve({
                resultDataUrl: localPreview.resultDataUrl,
                engineUsed: 'edge-client',
                latencyMs: Math.round(performance.now() - startTime)
              });
            }
          } catch {
            eventSource.close();
            resolve({
              resultDataUrl: localPreview.resultDataUrl,
              engineUsed: 'edge-client',
              latencyMs: Math.round(performance.now() - startTime)
            });
          }
        };

        eventSource.onerror = () => {
          eventSource.close();
          resolve({
            resultDataUrl: localPreview.resultDataUrl,
            engineUsed: 'edge-client',
            latencyMs: Math.round(performance.now() - startTime)
          });
        };
      });
    }
  } catch (err) {
    console.warn('Backend job queue unavailable, using local Web Worker result:', err);
  }

  // Offline / local fallback
  return {
    resultDataUrl: localPreview.resultDataUrl,
    engineUsed: 'edge-client',
    latencyMs: Math.round(performance.now() - startTime)
  };
};
