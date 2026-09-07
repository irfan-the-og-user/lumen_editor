import { loadImage, type Stroke } from './canvasUtils';
import type { PreviewWorkerRequest, PreviewWorkerResponse } from '../workers/previewWorker';

class PreviewWorkerManager {
  private worker: Worker | null = null;
  private pendingCallbacks = new Map<
    string,
    {
      resolve: (res: PreviewWorkerResponse) => void;
      reject: (err: Error) => void;
    }
  >();

  private getWorker(): Worker {
    if (!this.worker) {
      this.worker = new Worker(
        new URL('../workers/previewWorker.ts', import.meta.url),
        { type: 'module' }
      );

      this.worker.onmessage = (e: MessageEvent<PreviewWorkerResponse>) => {
        const { id, type, error } = e.data;
        const callback = this.pendingCallbacks.get(id);
        if (callback) {
          this.pendingCallbacks.delete(id);
          if (type === 'PREVIEW_SUCCESS') {
            callback.resolve(e.data);
          } else {
            callback.reject(new Error(error || 'Worker execution failed'));
          }
        }
      };

      this.worker.onerror = (err) => {
        console.error('Preview Worker Error:', err);
        // Reject all pending
        for (const [id, cb] of this.pendingCallbacks.entries()) {
          cb.reject(new Error('Worker encountered a fatal error'));
          this.pendingCallbacks.delete(id);
        }
      };
    }
    return this.worker;
  }

  public async requestPreview(request: Omit<PreviewWorkerRequest, 'id'>): Promise<PreviewWorkerResponse> {
    const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const worker = this.getWorker();

    return new Promise((resolve, reject) => {
      this.pendingCallbacks.set(id, { resolve, reject });
      const fullRequest: PreviewWorkerRequest = { ...request, id };

      // Transfer binary imageBuffer for zero-copy high performance
      worker.postMessage(fullRequest, [request.imageBuffer]);
    });
  }
}

export const previewWorkerManager = new PreviewWorkerManager();

/**
 * Converts image source to binary RGBA ArrayBuffer.
 */
export const imageSourceToBuffer = async (
  imageSrc: string
): Promise<{ buffer: ArrayBuffer; width: number; height: number }> => {
  const img = await loadImage(imageSrc);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas 2D context creation failed');

  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  return { buffer: imgData.data.buffer, width, height };
};

/**
 * Converts binary RGBA ArrayBuffer to data URL.
 */
export const bufferToDataUrl = (
  buffer: ArrayBuffer,
  width: number,
  height: number
): string => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const clamped = new Uint8ClampedArray(buffer);
  const imgData = ctx.createImageData(width, height);
  imgData.data.set(clamped);
  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL('image/png', 0.9);
};

/**
 * Fast Web Worker Inpainting Preview (<100ms on downscaled canvas)
 */
export const executeWorkerInpaintPreview = async (
  imageSrc: string,
  strokes: Stroke[]
): Promise<{ resultDataUrl: string; latencyMs: number }> => {
  const { buffer, width, height } = await imageSourceToBuffer(imageSrc);
  const response = await previewWorkerManager.requestPreview({
    type: 'INPAINT_PREVIEW',
    imageBuffer: buffer,
    width,
    height,
    strokes
  });

  if (!response.imageBuffer || !response.width || !response.height) {
    throw new Error('Invalid worker preview response');
  }

  const resultDataUrl = bufferToDataUrl(
    response.imageBuffer,
    response.width,
    response.height
  );

  return {
    resultDataUrl,
    latencyMs: response.latencyMs
  };
};

/**
 * Fast Web Worker Style Transfer Preview (<100ms on downscaled canvas)
 */
export const executeWorkerStylePreview = async (
  imageSrc: string,
  styleId: string
): Promise<{ resultDataUrl: string; latencyMs: number }> => {
  const { buffer, width, height } = await imageSourceToBuffer(imageSrc);
  const response = await previewWorkerManager.requestPreview({
    type: 'STYLE_PREVIEW',
    imageBuffer: buffer,
    width,
    height,
    styleId
  });

  if (!response.imageBuffer || !response.width || !response.height) {
    throw new Error('Invalid worker style preview response');
  }

  const resultDataUrl = bufferToDataUrl(
    response.imageBuffer,
    response.width,
    response.height
  );

  return {
    resultDataUrl,
    latencyMs: response.latencyMs
  };
};
