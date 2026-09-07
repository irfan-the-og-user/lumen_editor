# Lumen AI — Lightweight Mobile-First Creative Editor
> **Inter IIT Tech Meet 14.0 — PS-07 (Adobe Photoshop Mobile Challenge)**  
> *Democratizing high-end generative creative tools for 4 billion low-compute mobile devices.*

[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Bundle Size](https://img.shields.io/badge/Bundle-77KB_gzip-10B981?logo=webpack&logoColor=white)](#)
[![Zero Infra Cost](https://img.shields.io/badge/Infra-$0.00-10B981)](#)

---

## 1. Problem & Mission Brief

By 2030, generative image editing will define personal and professional workflows. However, existing creative suites (Photoshop Express, Lightroom Mobile, Canva) assume 8GB+ VRAM desktop GPUs or top-tier flagship smartphones, requiring **1GB+ app downloads** and continuous high-bandwidth cloud connections. Over **3.8 billion smartphone users** in emerging markets on budget Android devices (2–4GB RAM, intermittent 3G/4G networks) are locked out.

**Lumen AI** solves this through a **hybrid edge-first architecture**:
* **Ultra-Lightweight**: Entire client application is **< 77 KB gzipped** (zero app store download).
* **Zero GPU Hardware Lock-in**: Client-side Canvas shaders run in **< 80ms** directly on mobile CPUs/GPUs.
* **Seamless Cloud Scaling**: Thin Vercel Edge Serverless functions route high-resolution diffusion to free-tier Hugging Face models without leaking API keys to the client.

---

## 2. The Two Core AI Features

### 1. Neural Object Removal (Inpainting)
* **User Workflow**: User brushes over any unwanted object or text on the canvas with touch or mouse.
* **Dual-Tier Engine**:
  * *Edge Engine*: Multi-pass Poisson boundary diffusion & texture synthesis executed directly on `HTML5 Canvas ImageData` in **< 50ms**.
  * *Cloud Engine*: Serverless proxy (`/api/inpaint`) calling Hugging Face `runwayml/stable-diffusion-inpainting`.
* **Features**: Adjustable brush radius (8px to 72px), dynamic cursor ring follower, multi-level stroke undo, full mask clear, and progressive step-by-step loading feedback.

### 2. Neural Style Transfer & Split Comparison
* **User Workflow**: Select from 6 curated aesthetic archetypes (Cyberpunk Neo-Tokyo, Editorial Monochrome, Renaissance Oil Canvas, Studio Anime Glow, Kodachrome 1970, Architectural Blueprint).
* **Dual-Tier Engine**:
  * *Edge Engine*: Kuwahara non-linear painterly smoothing, S-curve monochrome tone mapping, and Sobel blueprint edge detection.
  * *Cloud Engine*: Serverless proxy (`/api/style-transfer`) calling Hugging Face `timbrooks/instruct-pix2pix`.
* **Interactive Comparison**:
  * **Draggable Split-Screen Slider**: Smooth real-time comparison divider with touch tracking.
  * **Hold for Original**: Tactile hold-to-view button for instant A/B inspection.

---

## 3. Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend UI** | React 19, TypeScript, Vite 8, Tailwind CSS v4 |
| **Design System** | `design-taste-frontend` specification ([`DESIGN.md`](./DESIGN.md)), Outfit Sans, JetBrains Mono |
| **Canvas Pipeline** | HTML5 Canvas 2D API, high-DPI scaling (`window.devicePixelRatio`), touch event isolation |
| **Edge AI Shaders** | Kuwahara non-linear convolution, multi-pass Poisson diffusion, Sobel gradient kernels |
| **Serverless API** | Vercel Serverless / Edge Functions (`/api/inpaint.ts`, `/api/style-transfer.ts`) |
| **Cloud Inference** | Hugging Face Free-Tier Inference API |

---

## 4. Quickstart & Local Development

### Prerequisites
* Node.js >= 18.0
* npm >= 9.0

### Installation & Run

```bash
# 1. Clone the repository
git clone https://github.com/nikhil/lumen-editor.git
cd lumen-editor

# 2. Install dependencies
npm install

# 3. Start development server
npm run dev

# 4. Run production build & preview
npm run build
npm run preview
```

### Optional: Hugging Face API Configuration
For cloud-based Stable Diffusion inference, set your free Hugging Face API token:
```bash
# Option A: Environment Variable Configuration
# Copy template and set your token
cp .env.example .env
export HF_TOKEN="hf_your_free_token_here"

# Option B: In-App Token Setting
# Tap the Key icon in the Object Removal toolbar to enter your token securely in the browser session.
```

---

## 5. Repository Structure

```
lumen-editor/
├── api/
│   ├── inpaint.ts             # Vercel serverless HF inpainting handler
│   └── style-transfer.ts      # Vercel serverless HF style transfer handler
├── src/
│   ├── components/
│   │   ├── Navbar.tsx             # Sticky header with telemetry & architecture trigger
│   │   ├── Hero.tsx               # Asymmetric editorial hero with low-compute metrics
│   │   ├── UploadDropzone.tsx     # Drag/drop, tap upload & 1-tap instant test scenarios
│   │   ├── CanvasWorkspace.tsx    # High-DPI canvas, touch brush mask, live cursor ring
│   │   ├── EditorToolbar.tsx      # Feature mode switcher, revert edit, HD export
│   │   ├── InpaintControls.tsx    # Object eraser CTA, progressive progress, telemetry
│   │   ├── StyleControls.tsx      # 6 style presets, Kuwahara trigger, split toggle
│   │   ├── ComparisonSlider.tsx   # Interactive draggable split comparison slider
│   │   ├── ArchitectureModal.tsx  # Dual-tier system architecture breakdown modal
│   │   └── Toast.tsx              # Tactile toast notification system
│   ├── utils/
│   │   ├── canvasUtils.ts         # Aspect-ratio fitting, DPI scaling, binary mask export
│   │   ├── inpaintingEngine.ts    # Multi-pass Poisson edge inpainter & HF client
│   │   ├── styleEngine.ts         # 6 style shaders, Kuwahara filter, Sobel edge detector
│   │   └── sampleImages.ts        # Zero-network SVG demo presets (landscape, street, arch)
│   ├── types/
│   │   └── index.ts               # TypeScript interfaces & domain types
│   ├── App.tsx                    # Core state machine & layout orchestration
│   ├── index.css                  # Tailwind v4 theme tokens & glassmorphism utilities
│   └── main.tsx                   # React root entry point
├── DESIGN.md                  # Strict design tokens & anti-slop rules
├── MARKET_RESEARCH.md         # 200-word competitive analysis & market note
├── DEMO_SCRIPT.md             # 75-second step-by-step video walkthrough script
├── WIREFRAMES.md              # ASCII diagrams & mobile UX layout schemas
├── KNOWN_ISSUES.md            # Non-blocking items & v2.0 roadmap
├── vercel.json                # Vercel static & serverless deployment config
└── package.json               # Dependencies and build scripts
```

---

## 6. Inter IIT Deliverables Checklist

- [x] **Working Prototype**: Fully operational inpainting and style transfer with dual edge/cloud pipelines.
- [x] **Mobile-First Validation**: Tested down to 375px viewport with zero horizontal overflow and 44px touch targets.
- [x] **Zero Cloud Infra Dependency**: Complete offline edge shaders working out of the box.
- [x] **Design Taste Compliance**: Apple Pro aesthetic, Outfit/JetBrains Mono typography, zero AI emojis.
- [x] **Market Research Note**: [`MARKET_RESEARCH.md`](./MARKET_RESEARCH.md).
- [x] **Demo Video Script**: [`DEMO_SCRIPT.md`](./DEMO_SCRIPT.md).
- [x] **Wireframes & Schematics**: [`WIREFRAMES.md`](./WIREFRAMES.md).
