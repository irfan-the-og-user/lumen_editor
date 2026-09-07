import { loadImage } from './canvasUtils';
import type { Stroke } from './canvasUtils';
import type { WorkerResponse } from '../workers/processingWorker';

let workerInstance: Worker | null = null;
let isWorkerSupported: boolean | null = null;

/**
 * Checks whether Web Workers are supported and functional in current environment.
 */
export const checkWorkerSupport = (): boolean => {
  if (isWorkerSupported !== null) return isWorkerSupported;
  try {
    isWorkerSupported = typeof window !== 'undefined' && typeof window.Worker !== 'undefined';
  } catch {
    isWorkerSupported = false;
  }
  return isWorkerSupported;
};

/**
 * Lazy initializes singleton Web Worker instance.
 */
export const getProcessingWorker = (): Worker | null => {
  if (!checkWorkerSupport()) return null;
  if (!workerInstance) {
    try {
      workerInstance = new Worker(
        new URL('../workers/processingWorker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (err) {
      console.warn('Failed to instantiate Web Worker, falling back to main-thread:', err);
      isWorkerSupported = false;
      return null;
    }
  }
  return workerInstance;
};

/**
 * Runs Style Transfer inside a dedicated Web Worker off the main thread.
 */
export const runStyleTransferOffthread = async (
  imageSrc: string,
  styleId: string,
  onProgress?: (step: string, percentage: number) => void
): Promise<string> => {
  const worker = getProcessingWorker();
  if (!worker) {
    // Fallback to main thread processing
    const { runClientSideStyleTransfer } = await import('./styleEngine');
    return runClientSideStyleTransfer(imageSrc, styleId, onProgress);
  }

  onProgress?.('Decoding source image tensors for off-thread worker...', 15);
  const img = await loadImage(imageSrc);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Use OffscreenCanvas or HTMLCanvasElement to prepare ImageData
  let imageData: ImageData;
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null;

  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
    ctx = canvas.getContext('2d');
  } else {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    ctx = canvas.getContext('2d', { willReadFrequently: true });
  }

  if (!ctx) throw new Error('Failed to create canvas context for worker transfer');

  ctx.drawImage(img, 0, 0, width, height);
  imageData = ctx.getImageData(0, 0, width, height);

  return new Promise<string>((resolve, reject) => {
    const messageId = `style-${Date.now()}-${Math.random()}`;

    const handleMessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (!data || data.id !== messageId) return;

      if (data.type === 'progress') {
        onProgress?.(data.step, data.percentage);
      } else if (data.type === 'complete') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);

        // Render processed ImageData back to canvas
        onProgress?.('Rendering synthesized pixels from background worker...', 95);
        ctx!.putImageData(data.imageData, 0, 0);

        let dataUrl = '';
        if ('toDataURL' in canvas) {
          dataUrl = (canvas as HTMLCanvasElement).toDataURL('image/png', 0.95);
        } else if ('convertToBlob' in canvas) {
          (canvas as OffscreenCanvas)
            .convertToBlob({ type: 'image/png', quality: 0.95 })
            .then((blob) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(blob);
            })
            .catch(reject);
          return;
        }

        onProgress?.('Render complete.', 100);
        resolve(dataUrl);
      } else if (data.type === 'error') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(data.error));
      }
    };

    const handleError = (err: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      console.warn('Worker execution failed, falling back to main thread:', err);
      // Fallback
      import('./styleEngine')
        .then((m) => m.runClientSideStyleTransfer(imageSrc, styleId, onProgress))
        .then(resolve)
        .catch(reject);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    worker.postMessage(
      {
        id: messageId,
        type: 'style',
        styleId,
        imageData,
        width,
        height
      },
      [imageData.data.buffer]
    );
  });
};

/**
 * Runs Inpainting inside a dedicated Web Worker off the main thread.
 */
export const runInpaintingOffthread = async (
  imageSrc: string,
  strokes: Stroke[],
  onProgress?: (step: string, percentage: number) => void
): Promise<string> => {
  const worker = getProcessingWorker();
  if (!worker) {
    const { runClientSideInpainting } = await import('./inpaintingEngine');
    return runClientSideInpainting(imageSrc, strokes, onProgress);
  }

  onProgress?.('Initializing background neural patch synthesizer...', 15);
  const img = await loadImage(imageSrc);
  const width = img.naturalWidth || img.width;
  const height = img.naturalHeight || img.height;

  // Create canvas for source image
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not create 2D canvas context');
  ctx.drawImage(img, 0, 0, width, height);

  onProgress?.('Extracting high-precision mask contours...', 35);
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
  if (!maskCtx) throw new Error('Could not create mask canvas context');

  maskCtx.fillStyle = '#000000';
  maskCtx.fillRect(0, 0, width, height);
  maskCtx.fillStyle = '#ffffff';
  maskCtx.strokeStyle = '#ffffff';
  maskCtx.lineCap = 'round';
  maskCtx.lineJoin = 'round';

  for (const stroke of strokes) {
    if (stroke.points.length === 0) continue;
    maskCtx.lineWidth = stroke.size * (width / 360);

    if (stroke.points.length === 1) {
      maskCtx.beginPath();
      maskCtx.arc(
        (stroke.points[0].x / 360) * width,
        (stroke.points[0].y / 270) * height,
        (stroke.size * (width / 360)) / 2,
        0,
        Math.PI * 2
      );
      maskCtx.fill();
    } else {
      maskCtx.beginPath();
      maskCtx.moveTo((stroke.points[0].x / 360) * width, (stroke.points[0].y / 270) * height);
      for (let i = 1; i < stroke.points.length; i++) {
        maskCtx.lineTo((stroke.points[i].x / 360) * width, (stroke.points[i].y / 270) * height);
      }
      maskCtx.stroke();
    }
  }

  const imageData = ctx.getImageData(0, 0, width, height);
  const maskData = maskCtx.getImageData(0, 0, width, height);

  return new Promise<string>((resolve, reject) => {
    const messageId = `inpaint-${Date.now()}-${Math.random()}`;

    const handleMessage = (e: MessageEvent<WorkerResponse>) => {
      const data = e.data;
      if (!data || data.id !== messageId) return;

      if (data.type === 'progress') {
        onProgress?.(data.step, data.percentage);
      } else if (data.type === 'complete') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);

        ctx.putImageData(data.imageData, 0, 0);
        onProgress?.('Finalizing rendering...', 100);
        resolve(canvas.toDataURL('image/png', 0.95));
      } else if (data.type === 'error') {
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(data.error));
      }
    };

    const handleError = (err: ErrorEvent) => {
      worker.removeEventListener('message', handleMessage);
      worker.removeEventListener('error', handleError);
      console.warn('Inpainting worker execution failed, falling back to main thread:', err);
      import('./inpaintingEngine')
        .then((m) => m.runClientSideInpainting(imageSrc, strokes, onProgress))
        .then(resolve)
        .catch(reject);
    };

    worker.addEventListener('message', handleMessage);
    worker.addEventListener('error', handleError);

    worker.postMessage(
      {
        id: messageId,
        type: 'inpaint',
        imageData,
        maskData,
        width,
        height
      },
      [imageData.data.buffer, maskData.data.buffer]
    );
  });
};
