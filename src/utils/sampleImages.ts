import type { SampleImage } from '../types';

// High-quality lightweight SVG Data URIs representing rich test photos for zero-network-dependency mobile testing
const createSampleSvg = (_title: string, bgGradient: string, shapes: string): string => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="768" viewBox="0 0 1024 768">
    <defs>
      ${bgGradient}
    </defs>
    <rect width="1024" height="768" fill="url(#bg)"/>
    ${shapes}
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const SAMPLE_IMAGES: SampleImage[] = [
  {
    id: 'sample-landscape',
    name: 'Alpine Vista (Remove Drone)',
    category: 'Object Removal',
    recommendedMode: 'inpaint',
    url: createSampleSvg(
      'Alpine Vista',
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#1e293b"/>
        <stop offset="50%" stop-color="#0f766e"/>
        <stop offset="100%" stop-color="#064e3b"/>
      </linearGradient>`,
      `<polygon points="100,600 350,280 600,600" fill="#0f172a" opacity="0.85"/>
       <polygon points="400,650 700,220 1000,650" fill="#022c22" opacity="0.9"/>
       <polygon points="350,280 320,330 380,330" fill="#f8fafc" opacity="0.95"/>
       <polygon points="700,220 660,280 740,280" fill="#f8fafc" opacity="0.95"/>
       <circle cx="200" cy="180" r="50" fill="#fef08a" opacity="0.8"/>
       <!-- Unwanted Object to Remove: Red Surveillance Drone -->
       <g id="target-drone" transform="translate(580, 160)">
         <ellipse cx="0" cy="0" rx="36" ry="14" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
         <circle cx="0" cy="0" r="8" fill="#18181b"/>
         <line x1="-45" y1="0" x2="45" y2="0" stroke="#f87171" stroke-width="3"/>
         <circle cx="-45" cy="0" r="12" fill="#dc2626" opacity="0.8"/>
         <circle cx="45" cy="0" r="12" fill="#dc2626" opacity="0.8"/>
         <text x="-30" y="32" font-family="sans-serif" font-size="14" font-weight="bold" fill="#fecaca">TARGET OBJECT</text>
       </g>
       <rect y="580" width="1024" height="188" fill="#042f2e"/>`
    )
  },
  {
    id: 'sample-street',
    name: 'Cyberpunk Alley (Remove Sign)',
    category: 'Object Removal',
    recommendedMode: 'inpaint',
    url: createSampleSvg(
      'Cyberpunk Alley',
      `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#18181b"/>
        <stop offset="60%" stop-color="#27272a"/>
        <stop offset="100%" stop-color="#09090b"/>
      </linearGradient>`,
      `<rect x="120" y="100" width="220" height="580" fill="#1e1e24"/>
       <rect x="680" y="80" width="260" height="600" fill="#1e1e24"/>
       <!-- Neon lights -->
       <line x1="140" y1="150" x2="140" y2="350" stroke="#06b6d4" stroke-width="6" opacity="0.8"/>
       <line x1="720" y1="120" x2="720" y2="400" stroke="#10b981" stroke-width="6" opacity="0.8"/>
       <!-- Unwanted Billboard to remove -->
       <g transform="translate(420, 240)">
         <rect x="-60" y="-40" width="160" height="90" rx="8" fill="#f59e0b" stroke="#ffffff" stroke-width="3"/>
         <text x="-40" y="15" font-family="sans-serif" font-size="18" font-weight="bold" fill="#000000">ADS / TRASH</text>
         <line x1="20" y1="50" x2="20" y2="180" stroke="#71717a" stroke-width="6"/>
       </g>
       <rect y="640" width="1024" height="128" fill="#09090b"/>`
    )
  },
  {
    id: 'sample-architecture',
    name: 'Minimal Architecture',
    category: 'Style Transfer',
    recommendedMode: 'style',
    url: createSampleSvg(
      'Minimal Architecture',
      `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#0284c7"/>
        <stop offset="100%" stop-color="#bae6fd"/>
      </linearGradient>`,
      `<polygon points="200,768 200,200 500,280 500,768" fill="#f8fafc"/>
       <polygon points="500,280 820,180 820,768 500,768" fill="#cbd5e1"/>
       <rect x="260" y="320" width="60" height="100" fill="#0284c7" opacity="0.8"/>
       <rect x="380" y="350" width="60" height="100" fill="#0284c7" opacity="0.8"/>
       <rect x="580" y="340" width="80" height="120" fill="#0369a1" opacity="0.9"/>
       <rect x="700" y="320" width="80" height="120" fill="#0369a1" opacity="0.9"/>`
    )
  }
];
