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
