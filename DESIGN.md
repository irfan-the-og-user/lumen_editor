# DESIGN SYSTEM & TOKEN SPECIFICATION: LUMEN AI (INTER IIT 14.0)

## 1. Architectural Philosophy
* **Product Archetype**: Apple Pro App meets High-End Editorial Creative Suite.
* **Core Philosophy**: Mobile-first, zero-clutter, ultra-lightweight (<250KB client asset overhead), high-efficiency tactile editing for low-compute / low-bandwidth mobile devices.
* **Dial Settings**:
  * `DESIGN_VARIANCE`: 7 (Offset, purposeful asymmetry, clean editorial structure)
  * `MOTION_INTENSITY`: 6 (Fluid spring physics, tactile active states, smooth hardware-accelerated transforms)
  * `VISUAL_DENSITY`: 4 (Airy, precise whitespace, generous touch targets >= 44px)

---

## 2. Color System
*Strictly neutral zinc foundation with a single high-contrast precision accent. Generic purple/neon glows are strictly prohibited.*

| Token | Hex / Value | Semantic Role |
| :--- | :--- | :--- |
| `bg-canvas` | `#09090b` (Zinc-950) | App background (Pure off-black) |
| `bg-surface` | `#121215` (Zinc-900 / 80) | Card/Sheet/Tool container |
| `bg-surface-elevated` | `#1c1c21` (Zinc-850) | Modal, dropdown, active tool surface |
| `border-subtle` | `rgba(255, 255, 255, 0.07)` | Structural dividers and bounding boxes |
| `border-active` | `rgba(255, 255, 255, 0.18)` | Hover / Selected state borders |
| `accent-primary` | `#10b981` (Emerald-500) | Primary active state, action confirmation, mask overlay |
| `accent-glow` | `rgba(16, 185, 129, 0.15)` | Subtle ambient focus ring |
| `text-primary` | `#f4f4f5` (Zinc-100) | High-contrast display & interactive labels |
| `text-secondary` | `#a1a1aa` (Zinc-400) | Supporting descriptions, metadata, shortcuts |
| `text-tertiary` | `#52525b` (Zinc-600) | Placeholders, inactive state icons |
| `mask-overlay` | `rgba(244, 63, 94, 0.45)` | High-visibility inpainting brush stroke highlight |

---

## 3. Typography Hierarchy
*Pairing Satoshi / Outfit Sans with JetBrains Mono for metrics and tool specs.*

* **Display Title (Hero / Large)**: `font-sans text-3xl sm:text-5xl font-semibold tracking-[-0.03em] leading-[1.1]`
* **Section Heading**: `font-sans text-lg sm:text-xl font-medium tracking-tight text-zinc-100`
* **Body / Instructions**: `font-sans text-sm sm:text-base text-zinc-400 font-normal leading-relaxed max-w-[65ch]`
* **Tool Label / Caption**: `font-sans text-xs font-medium uppercase tracking-wider text-zinc-400`
* **Telemetry / Metrics**: `font-mono text-xs text-zinc-400 tracking-tight`

---

## 4. Elevation & Materiality (Liquid Glass System)
* **Glass Surface**: `backdrop-blur-md bg-zinc-900/80 border border-white/[0.08] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_12px_32px_-8px_rgba(0,0,0,0.5)]`
* **Floating Control Island**: `rounded-2xl bg-zinc-900/90 border border-white/10 shadow-2xl backdrop-blur-xl`
* **Tactile Button**: `:active:scale-[0.97] transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)]`

---

## 5. Mobile Ergonomics Guardrails
1. **Minimum Tap Target**: `44px x 44px` on all interactive buttons and toggles.
2. **Bottom-Weighted Controls**: Canvas workspace in upper viewport, tool controls pinned to bottom thumb-zone on `<768px`.
3. **Viewport Height Safety**: All full-screen containers use `min-h-[100dvh]` to eliminate mobile address-bar resize jumps.
4. **Zero Horizontal Overflow**: Strict `max-w-full overflow-x-hidden` on mobile root containers.
5. **Anti-Emoji Policy**: Pure SVG icons (`lucide-react`), no emojis in UI.
