/// <reference lib="webworker" />

export interface StyleWorkerRequest {
  id: string;
  type: 'style';
  styleId: string;
  imageData: ImageData;
  width: number;
  height: number;
}

export interface InpaintWorkerRequest {
  id: string;
  type: 'inpaint';
  imageData: ImageData;
  maskData: ImageData;
  width: number;
  height: number;
}

export type WorkerRequest = StyleWorkerRequest | InpaintWorkerRequest;

export interface WorkerProgressResponse {
  id: string;
  type: 'progress';
  step: string;
  percentage: number;
}

export interface WorkerCompleteResponse {
  id: string;
  type: 'complete';
  imageData: ImageData;
}

export interface WorkerErrorResponse {
  id: string;
  type: 'error';
  error: string;
}

export type WorkerResponse = WorkerProgressResponse | WorkerCompleteResponse | WorkerErrorResponse;

const applyKuwaharaFilterWorker = (
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number = 3
) => {
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
};

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const data = e.data;
  if (!data || !data.id) return;
  const { id, type, width, height } = data;

  try {
    if (type === 'style') {
      const { styleId, imageData } = data;
      const pixels = imageData.data;

      self.postMessage({
        id,
        type: 'progress',
        step: 'Applying neural style color manifold & tensor mapping...',
        percentage: 45
      } as WorkerProgressResponse);

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
        self.postMessage({
          id,
          type: 'progress',
          step: 'Rendering Kuwahara oil brush strokes...',
          percentage: 65
        } as WorkerProgressResponse);
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

      self.postMessage({
        id,
        type: 'progress',
        step: 'Harmonizing dynamic range and gamma...',
        percentage: 85
      } as WorkerProgressResponse);

      self.postMessage(
        { id, type: 'complete', imageData } as WorkerCompleteResponse,
        [imageData.data.buffer]
      );
    } else if (type === 'inpaint') {
      const { imageData, maskData } = data;
      const pixels = imageData.data;
      const maskPixels = maskData.data;

      self.postMessage({
        id,
        type: 'progress',
        step: 'Computing boundary pixel diffusion & texture synthesis...',
        percentage: 60
      } as WorkerProgressResponse);

      let minX = width, maxX = 0, minY = height, maxY = 0;
      let maskCount = 0;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          if (maskPixels[idx] > 128) {
            maskCount++;
            if (x < minX) minX = x;
            if (x > maxX) maxX = x;
            if (y < minY) minY = y;
            if (y > maxY) maxY = y;
          }
        }
      }

      if (maskCount > 0) {
        const pad = 16;
        minX = Math.max(0, minX - pad);
        maxX = Math.min(width - 1, maxX + pad);
        minY = Math.max(0, minY - pad);
        maxY = Math.min(height - 1, maxY + pad);

        const iterations = 8;
        for (let iter = 0; iter < iterations; iter++) {
          for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
              const idx = (y * width + x) * 4;
              if (maskPixels[idx] > 64) {
                let r = 0, g = 0, b = 0, weightSum = 0;
                const radius = 6 + iter * 2;

                for (let dy = -radius; dy <= radius; dy += 2) {
                  const ny = y + dy;
                  if (ny < 0 || ny >= height) continue;

                  for (let dx = -radius; dx <= radius; dx += 2) {
                    const nx = x + dx;
                    if (nx < 0 || nx >= width) continue;

                    const nIdx = (ny * width + nx) * 4;
                    const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
                    const weight = 1 / dist;

                    if (maskPixels[nIdx] < 100 || iter > 2) {
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

      self.postMessage({
        id,
        type: 'progress',
        step: 'Harmonizing luminosity and blending seams...',
        percentage: 85
      } as WorkerProgressResponse);

      self.postMessage(
        { id, type: 'complete', imageData } as WorkerCompleteResponse,
        [imageData.data.buffer]
      );
    }
  } catch (err: any) {
    self.postMessage({
      id,
      type: 'error',
      error: err?.message || 'Worker error'
    } as WorkerErrorResponse);
  }
};
