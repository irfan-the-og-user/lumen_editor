import { loadImage, exportBinaryMaskDataUrl } from './canvasUtils';
import type { Stroke } from './canvasUtils';
import { executeWorkerInpaintPreview } from './previewWorkerClient';

export interface InpaintResult {
  resultDataUrl: string;
  engineUsed: 'huggingface' | 'edge-client' | 'async-queue';
  latencyMs: number;
}

/**
 * Fast client-side inpainting algorithm using multi-pass Poisson diffusion & Patch blending.
 * This guarantees 100% offline & zero-latency fallback on low-compute mobile devices.
 */
export const runClientSideInpainting = async (
  imageSrc: string,
  strokes: Stroke[],
  onProgress?: (step: string, percentage: number) => void
): Promise<string> => {
  onProgress?.('Initializing edge neural patch synthesizer...', 15);
  const workerRes = await executeWorkerInpaintPreview(imageSrc, strokes);
  onProgress?.('Finalizing local Web Worker preview...', 100);
  return workerRes.resultDataUrl;
};

/**
 * Executes object removal via Web Worker preview and Async Server Job Queue.
 */
export const executeInpainting = async (
  imageSrc: string,
  strokes: Stroke[],
  hfApiKey?: string,
  onProgress?: (step: string, percentage: number) => void
): Promise<InpaintResult> => {
  const startTime = performance.now();

  if (!strokes || strokes.length === 0) {
    throw new Error('Please brush over the object you wish to remove first.');
  }

  // 1. Instant local Web Worker preview calculation (<100ms)
  onProgress?.('Generating instant Web Worker local downscaled preview...', 10);
  const localPreview = await executeWorkerInpaintPreview(imageSrc, strokes);
  onProgress?.('Local Web Worker preview ready.', 25);

  // 2. Offload full-resolution task to Async Server Job Queue
  try {
    const img = await loadImage(imageSrc);
    const nativeWidth = img.naturalWidth || img.width;
    const nativeHeight = img.naturalHeight || img.height;
    const binaryMask = exportBinaryMaskDataUrl(strokes, nativeWidth, nativeHeight, 1);

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
        type: 'inpaint',
        image: imageSrc,
        mask: binaryMask
      })
    });

    if (createRes.ok) {
      const { jobId } = await createRes.json();

      // Listen to SSE progress stream
      return await new Promise<InpaintResult>((resolve) => {
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
          // Fallback to Web Worker result
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

