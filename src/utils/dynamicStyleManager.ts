/**
 * Utility to inject dynamic CSS class rules at runtime into a managed stylesheet.
 * Ensures that dynamic styling (e.g. canvas dimensions, brush cursor position)
 * renders exclusively via class names without using inline style attributes.
 */

let dynamicSheet: CSSStyleSheet | null = null;
const injectedClasses = new Set<string>();

const getDynamicSheet = (): CSSStyleSheet | null => {
  if (dynamicSheet) return dynamicSheet;
  if (typeof document === 'undefined') return null;

  let styleEl = document.getElementById('lumen-dynamic-styles') as HTMLStyleElement;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = 'lumen-dynamic-styles';
    document.head.appendChild(styleEl);
  }
  dynamicSheet = styleEl.sheet;
  return dynamicSheet;
};

export const ensureClass = (className: string, rulesCss: string): string => {
  if (injectedClasses.has(className)) return className;
  injectedClasses.add(className);

  const sheet = getDynamicSheet();
  if (sheet) {
    try {
      sheet.insertRule(`.${className} { ${rulesCss} }`, sheet.cssRules.length);
    } catch (e) {
      console.warn('Failed to insert dynamic CSS rule:', className, e);
    }
  }
  return className;
};

export const getProgressClass = (percentage: number): string => {
  const p = Math.min(100, Math.max(0, Math.round(percentage)));
  return ensureClass(`progress-w-${p}`, `width: ${p}%;`);
};

export const getSliderClipClass = (percentage: number): string => {
  const p = Math.min(100, Math.max(0, Math.round(percentage)));
  return ensureClass(`clip-slider-${p}`, `clip-path: inset(0 ${100 - p}% 0 0);`);
};

export const getSliderLeftClass = (percentage: number): string => {
  const p = Math.min(100, Math.max(0, Math.round(percentage)));
  return ensureClass(`slider-left-${p}`, `left: ${p}%;`);
};

export const getCanvasSizeClass = (width: number, height: number): string => {
  const w = Math.round(width);
  const h = Math.round(height);
  return ensureClass(`canvas-size-${w}-${h}`, `width: ${w}px; height: ${h}px;`);
};

export const getZoomScaleClass = (zoomLevel: number): string => {
  const z = Math.round(zoomLevel * 100);
  return ensureClass(`zoom-scale-${z}`, `transform: scale(${zoomLevel});`);
};

export const getCursorPosClass = (x: number, y: number): string => {
  const rx = Math.round(x);
  const ry = Math.round(y);
  return ensureClass(`pos-x-${rx}-y-${ry}`, `left: ${rx}px; top: ${ry}px;`);
};

export const getCursorSizeClass = (size: number): string => {
  const s = Math.round(size);
  return ensureClass(`cursor-size-${s}`, `width: ${s}px; height: ${s}px;`);
};
