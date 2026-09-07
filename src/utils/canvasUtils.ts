/**
 * Canvas utility functions for high-DPI rendering, mask extraction, and image transformations.
 */

export interface Point {
  x: number;
  y: number;
}

export interface Stroke {
  points: Point[];
  size: number;
  color: string;
}

/**
 * Loads an image URL into an HTMLImageElement asynchronously.
 */
export const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

/**
 * Calculates optimal fitted canvas dimensions while preserving aspect ratio
 * and respecting max container bounds.
 */
export const calculateFitDimensions = (
  imgWidth: number,
  imgHeight: number,
  maxWidth: number,
  maxHeight: number
): { width: number; height: number; scale: number } => {
  const aspect = imgWidth / imgHeight;
  let width = maxWidth;
  let height = maxWidth / aspect;

  if (height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspect;
  }

  const scale = width / imgWidth;
  return { width: Math.round(width), height: Math.round(height), scale };
};

/**
 * Normalizes legacy stroke data (in display/viewport pixels) to unit vector space [0..1].
 * Keeps aspect-preserved normalized strokes unchanged.
 */
export const normalizeStroke = (
  stroke: Stroke,
  fallbackWidth: number = 360,
  fallbackHeight: number = 270
): Stroke => {
  const isLegacyPoints = stroke.points.some((p) => p.x > 1.0 || p.y > 1.0);
  const isLegacySize = stroke.size > 1.0;

  if (!isLegacyPoints && !isLegacySize) {
    return stroke;
  }

  const normPoints = stroke.points.map((p) => ({
    x: p.x > 1.0 ? Math.max(0, Math.min(1, p.x / fallbackWidth)) : p.x,
    y: p.y > 1.0 ? Math.max(0, Math.min(1, p.y / fallbackHeight)) : p.y
  }));

  const normSize = isLegacySize ? stroke.size / fallbackWidth : stroke.size;

  return {
    ...stroke,
    points: normPoints,
    size: normSize
  };
};

/**
 * Renders normalized vector strokes onto any canvas context with exact aspect preservation.
 */
export const renderStrokesToContext = (
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  canvasWidth: number,
  canvasHeight: number,
  colorOverride?: string
): void => {
  for (const rawStroke of strokes) {
    const stroke = normalizeStroke(rawStroke, canvasWidth, canvasHeight);
    if (stroke.points.length === 0) continue;

    const color = colorOverride || stroke.color;
    const lineWidth = Math.max(1, stroke.size * canvasWidth);

    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = lineWidth;

    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(
        stroke.points[0].x * canvasWidth,
        stroke.points[0].y * canvasHeight,
        lineWidth / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * canvasWidth, stroke.points[0].y * canvasHeight);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * canvasWidth, stroke.points[i].y * canvasHeight);
      }
      ctx.stroke();
    }
  }
};

/**
 * Exports a binary mask from strokes scaled to the original image's native resolution.
 * Native inpainting models require: White (255) = Inpaint/Remove, Black (0) = Keep.
 */
export const exportBinaryMaskDataUrl = (
  strokes: Stroke[],
  nativeWidth: number,
  nativeHeight: number,
  _displayScale?: number
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = nativeWidth;
  canvas.height = nativeHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background must be pure black
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, nativeWidth, nativeHeight);

  // Draw each stroke scaled to native coordinates in pure white
  renderStrokesToContext(ctx, strokes, nativeWidth, nativeHeight, '#ffffff');

  return canvas.toDataURL('image/png');
};

/**
 * Converts a base64 Data URL to a Blob.
 */
export const dataUrlToBlob = (dataUrl: string): Blob => {
  const arr = dataUrl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};
