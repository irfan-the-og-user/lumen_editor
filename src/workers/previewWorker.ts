/**
 * Web Worker for Real-Time Mobile Editing Previews.
 * Runs off the main UI thread to prevent input lag and main-thread frame drops.
 * Enforces a max canvas dimension of 1080p (<=1080px) to prevent mobile browser memory exhaustion.
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

export interface PreviewWorkerRequest {
  id: string;
  type: 'INPAINT_PREVIEW' | 'STYLE_PREVIEW';
  imageBuffer: ArrayBuffer;
  width: number;
  height: number;
  strokes?: Stroke[];
  styleId?: string;
}

export interface PreviewWorkerResponse {
  id: string;
  type: 'PREVIEW_SUCCESS' | 'PREVIEW_ERROR';
  imageBuffer?: ArrayBuffer;
  width?: number;
  height?: number;
  latencyMs: number;
  error?: string;
}

const MAX_PREVIEW_DIMENSION = 1080;

/**
 * Downscales pixel buffer if dimensions exceed 1080p.
 */
function downscaleBufferIfNeeded(
  srcBuffer: Uint8ClampedArray,
  srcW: number,
  srcH: number
): { buffer: Uint8ClampedArray; width: number; height: number; scale: number } {
  if (srcW <= MAX_PREVIEW_DIMENSION && srcH <= MAX_PREVIEW_DIMENSION) {
    return { buffer: srcBuffer, width: srcW, height: srcH, scale: 1 };
  }

  const scale = MAX_PREVIEW_DIMENSION / Math.max(srcW, srcH);
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);
  const dstBuffer = new Uint8ClampedArray(dstW * dstH * 4);

  for (let y = 0; y < dstH; y++) {
    const srcY = Math.min(srcH - 1, Math.floor(y / scale));
    for (let x = 0; x < dstW; x++) {
      const srcX = Math.min(srcW - 1, Math.floor(x / scale));
      const srcIdx = (srcY * srcW + srcX) * 4;
      const dstIdx = (y * dstW + x) * 4;

      dstBuffer[dstIdx] = srcBuffer[srcIdx];
      dstBuffer[dstIdx + 1] = srcBuffer[srcIdx + 1];
      dstBuffer[dstIdx + 2] = srcBuffer[srcIdx + 2];
      dstBuffer[dstIdx + 3] = srcBuffer[srcIdx + 3];
    }
  }

  return { buffer: dstBuffer, width: dstW, height: dstH, scale };
}

/**
 * Kuwahara painterly smoothing filter running in worker thread
 */
function applyKuwaharaFilterWorker(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number = 3
) {
  const copy = new Uint8ClampedArray(pixels);

  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let minVariance = Infinity;
      let targetR = 0, targetG = 0, targetB = 0;

      const quadrants = [
        { x0: x - radius, x1: x, y0: y - radius, y1: y },
        { x0: x, x1: x + radius, y0: y - radius, y1: y },
        { x0: x - radius, x1: x, y0: y, y1: y + radius },
        { x0: x, x1: x + radius, y0: y, y1: y + radius }
      ];

      for (const q of quadrants) {
        let sumR = 0, sumG = 0, sumB = 0, sumSqR = 0, sumSqG = 0, sumSqB = 0;
        let count = 0;

        for (let qy = q.y0; qy <= q.y1; qy++) {
          for (let qx = q.x0; qx <= q.x1; qx++) {
            const idx = (qy * width + qx) * 4;
            const r = copy[idx];
            const g = copy[idx + 1];
            const b = copy[idx + 2];

            sumR += r;
            sumG += g;
            sumB += b;
            sumSqR += r * r;
            sumSqG += g * g;
            sumSqB += b * b;
            count++;
          }
        }

        const meanR = sumR / count;
        const meanG = sumG / count;
        const meanB = sumB / count;
        const variance =
          (sumSqR - (sumR * sumR) / count) +
          (sumSqG - (sumG * sumG) / count) +
          (sumSqB - (sumB * sumB) / count);

        if (variance < minVariance) {
          minVariance = variance;
          targetR = meanR;
          targetG = meanG;
          targetB = meanB;
        }
      }

      const outIdx = (y * width + x) * 4;
      pixels[outIdx] = targetR;
      pixels[outIdx + 1] = targetG;
      pixels[outIdx + 2] = targetB;
    }
  }
}

/**
 * Worker Style Transfer Shader
 */
function processStyleTransferWorker(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  styleId: string
) {
  if (styleId === 'cyberpunk') {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      pixels[i] = Math.min(255, lum < 128 ? r * 0.4 : r * 1.4 + 40);
      pixels[i + 1] = Math.min(255, lum < 128 ? g * 1.3 + 30 : g * 0.7);
      pixels[i + 2] = Math.min(255, b * 1.5 + 40);
    }
  } else if (styleId === 'monochrome') {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      let lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      lum = Math.pow(lum / 255, 1.4) * 255 * 1.15;
      const grain = (Math.random() - 0.5) * 8;
      const finalVal = Math.min(255, Math.max(0, lum + grain));

      pixels[i] = finalVal;
      pixels[i + 1] = finalVal;
      pixels[i + 2] = finalVal;
    }
  } else if (styleId === 'oil-painting') {
    applyKuwaharaFilterWorker(pixels, width, height, 3);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = Math.min(255, pixels[i] * 1.15 + 10);
      pixels[i + 1] = Math.min(255, pixels[i + 1] * 1.05 + 5);
      pixels[i + 2] = Math.max(0, pixels[i + 2] * 0.85 - 10);
    }
  } else if (styleId === 'anime-ghibli') {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);

      pixels[i] = Math.min(255, r + (r - (max + min) / 2) * 0.4 + 15);
      pixels[i + 1] = Math.min(255, g + (g - (max + min) / 2) * 0.5 + 20);
      pixels[i + 2] = Math.min(255, b + (b - (max + min) / 2) * 0.3 + 25);
    }
  } else if (styleId === 'vintage-film') {
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      pixels[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189 + 15);
      pixels[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
      pixels[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    }
  } else if (styleId === 'blueprint') {
    const copy = new Uint8ClampedArray(pixels);
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;

        const gx =
          -copy[((y - 1) * width + (x - 1)) * 4] +
          copy[((y - 1) * width + (x + 1)) * 4] -
          2 * copy[(y * width + (x - 1)) * 4] +
          2 * copy[(y * width + (x + 1)) * 4] -
          copy[((y + 1) * width + (x - 1)) * 4] +
          copy[((y + 1) * width + (x + 1)) * 4];

        const gy =
          -copy[((y - 1) * width + (x - 1)) * 4] -
          2 * copy[((y - 1) * width + x) * 4] -
          copy[((y - 1) * width + (x + 1)) * 4] +
          copy[((y + 1) * width + (x - 1)) * 4] +
          2 * copy[(y * width + x) * 4] +
          copy[((y + 1) * width + (x + 1)) * 4];

        const edge = Math.sqrt(gx * gx + gy * gy);

        if (edge > 45) {
          pixels[idx] = 240;
          pixels[idx + 1] = 245;
          pixels[idx + 2] = 255;
        } else {
          pixels[idx] = 12;
          pixels[idx + 1] = 45;
          pixels[idx + 2] = 95;
        }
      }
    }
  }
}

/**
 * Worker Inpainting Diffusion Shader
 */
function processInpaintingWorker(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  strokes: Stroke[]
) {
  if (!strokes || strokes.length === 0) return;

  // Build binary mask array: 1 = masked, 0 = keep
  const mask = new Uint8Array(width * height);

  for (const stroke of strokes) {
    if (!stroke.points || stroke.points.length === 0) continue;
    const strokeSize = stroke.size * (width / 360);
    const radius = Math.max(1, strokeSize / 2);

    for (let pIdx = 0; pIdx < stroke.points.length; pIdx++) {
      const pt = stroke.points[pIdx];
      const cx = Math.round((pt.x / 360) * width);
      const cy = Math.round((pt.y / 270) * height);

      const minX = Math.max(0, Math.floor(cx - radius));
      const maxX = Math.min(width - 1, Math.ceil(cx + radius));
      const minY = Math.max(0, Math.floor(cy - radius));
      const maxY = Math.min(height - 1, Math.ceil(cy + radius));

      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          const dx = x - cx;
          const dy = y - cy;
          if (dx * dx + dy * dy <= radius * radius) {
            mask[y * width + x] = 1;
          }
        }
      }
    }
  }

  // Find mask bounding box
  let minX = width, maxX = 0, minY = height, maxY = 0, maskCount = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        maskCount++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maskCount === 0) return;

  const pad = 16;
  minX = Math.max(0, minX - pad);
  maxX = Math.min(width - 1, maxX + pad);
  minY = Math.max(0, minY - pad);
  maxY = Math.min(height - 1, maxY + pad);

  const iterations = 8;
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const mIdx = y * width + x;
        if (mask[mIdx] === 1) {
          const idx = mIdx * 4;
          let r = 0, g = 0, b = 0, weightSum = 0;
          const searchRadius = 6 + iter * 2;

          for (let dy = -searchRadius; dy <= searchRadius; dy += 2) {
            const ny = y + dy;
            if (ny < 0 || ny >= height) continue;

            for (let dx = -searchRadius; dx <= searchRadius; dx += 2) {
              const nx = x + dx;
              if (nx < 0 || nx >= width) continue;

              const nMIdx = ny * width + nx;
              const nIdx = nMIdx * 4;
              const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
              const weight = 1 / dist;

              if (mask[nMIdx] === 0 || iter > 2) {
                r += pixels[nIdx] * weight;
                g += pixels[nIdx + 1] * weight;
                b += pixels[nIdx + 2] * weight;
                weightSum += weight;
              }
            }
          }

          if (weightSum > 0) {
            const grain = (Math.random() - 0.5) * 4;
            pixels[idx] = Math.min(255, Math.max(0, Math.round(r / weightSum + grain)));
            pixels[idx + 1] = Math.min(255, Math.max(0, Math.round(g / weightSum + grain)));
            pixels[idx + 2] = Math.min(255, Math.max(0, Math.round(b / weightSum + grain)));
          }
        }
      }
    }
  }
}

self.onmessage = (e: MessageEvent<PreviewWorkerRequest>) => {
  const startTime = performance.now();
  const { id, type, imageBuffer, width, height, strokes, styleId } = e.data;

  try {
    const rawPixels = new Uint8ClampedArray(imageBuffer);
    const { buffer: pixels, width: pW, height: pH } = downscaleBufferIfNeeded(
      rawPixels,
      width,
      height
    );

    if (type === 'INPAINT_PREVIEW' && strokes) {
      processInpaintingWorker(pixels, pW, pH, strokes);
    } else if (type === 'STYLE_PREVIEW' && styleId) {
      processStyleTransferWorker(pixels, pW, pH, styleId);
    }

    const latencyMs = Math.round(performance.now() - startTime);
    const responseBuffer = pixels.buffer as ArrayBuffer;

    const response: PreviewWorkerResponse = {
      id,
      type: 'PREVIEW_SUCCESS',
      imageBuffer: responseBuffer,
      width: pW,
      height: pH,
      latencyMs
    };

    // Transfer binary buffer back to main thread using zero-copy Transferable
    // @ts-ignore
    self.postMessage(response, [responseBuffer]);
  } catch (err: any) {
    const response: PreviewWorkerResponse = {
      id,
      type: 'PREVIEW_ERROR',
      latencyMs: Math.round(performance.now() - startTime),
      error: err?.message || 'Worker processing error'
    };
    // @ts-ignore
    self.postMessage(response);
  }
};
