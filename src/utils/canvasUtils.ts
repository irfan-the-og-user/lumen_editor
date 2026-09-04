/**
 * Canvas utility functions for high-DPI rendering, mask extraction, and image transformations.
 */

import type { AdjustmentSettings } from '../types';

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
 * Exports a binary mask from strokes scaled to the original image's native resolution.
 * Native inpainting models require: White (255) = Inpaint/Remove, Black (0) = Keep.
 */
export const exportBinaryMaskDataUrl = (
  strokes: Stroke[],
  nativeWidth: number,
  nativeHeight: number,
  displayScale: number
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
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const scaleFactor = 1 / displayScale;

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    ctx.lineWidth = stroke.size * scaleFactor;

    if (stroke.points.length === 1) {
      ctx.beginPath();
      ctx.arc(
        stroke.points[0].x * scaleFactor,
        stroke.points[0].y * scaleFactor,
        (stroke.size * scaleFactor) / 2,
        0,
        Math.PI * 2
      );
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x * scaleFactor, stroke.points[0].y * scaleFactor);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x * scaleFactor, stroke.points[i].y * scaleFactor);
      }
      ctx.stroke();
    }
  }

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

/**
  * Builds a 2D Canvas filter string from adjustment slider settings.
  */
export const buildCanvasFilterString = (settings: AdjustmentSettings): string => {
  const { brightness, contrast, saturation, warmth, exposure, sepia } = settings;
  const totalBrightness = 100 + brightness + exposure * 0.8;
  const totalContrast = 100 + contrast + exposure * 0.2;
  const totalSaturation = 100 + saturation;
  const hueRotate = warmth * 0.25;

  const filters: string[] = [];
  if (totalBrightness !== 100) filters.push(`brightness(${Math.max(0, totalBrightness)}%)`);
  if (totalContrast !== 100) filters.push(`contrast(${Math.max(0, totalContrast)}%)`);
  if (totalSaturation !== 100) filters.push(`saturate(${Math.max(0, totalSaturation)}%)`);
  if (sepia > 0) filters.push(`sepia(${sepia}%)`);
  if (hueRotate !== 0) filters.push(`hue-rotate(${hueRotate}deg)`);

  return filters.length > 0 ? filters.join(' ') : 'none';
};

/**
 * Creates a memory-cached Object URL blob from a canvas element.
 */
export const createCanvasBlobUrl = (canvas: HTMLCanvasElement): Promise<string> => {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(URL.createObjectURL(blob));
      } else {
        resolve(canvas.toDataURL('image/png'));
      }
    }, 'image/png');
  });
};

/**
 * Renders an HTMLImageElement onto a target canvas with adjustment filters applied.
 */
export const renderImageWithAdjustments = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  settings: AdjustmentSettings,
  width: number,
  height: number
) => {
  ctx.save();
  ctx.clearRect(0, 0, width, height);
  ctx.filter = buildCanvasFilterString(settings);
  ctx.drawImage(img, 0, 0, width, height);
  ctx.restore();
};
