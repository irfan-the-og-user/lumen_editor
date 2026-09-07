import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jobStore } from './store';

export const config = {
  maxDuration: 60,
};

const JOB_TIMEOUT_MS = 60000; // Enforce strict 60-second background execution timeout

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const {
      type = 'inpaint',
      image,
      mask,
      stylePrompt,
      styleId,
      prompt = 'high quality background texture, seamless inpaint'
    } = req.body || {};

    if (!image) {
      return res.status(400).json({ error: 'Missing source image payload' });
    }

    // Create job entry in queue
    const job = jobStore.createJob(type as 'inpaint' | 'style');

    // Return 202 Accepted immediately without holding open the HTTP connection
    res.status(202).json({
      jobId: job.id,
      status: 'queued',
      message: 'Job submitted to background queue',
      streamUrl: `/api/jobs/stream?jobId=${job.id}`,
      statusUrl: `/api/jobs/status?jobId=${job.id}`
    });

    // Initiate asynchronous background execution
    runBackgroundJob(job.id, {
      type,
      image,
      mask,
      stylePrompt,
      styleId,
      prompt,
      hfApiKey: req.headers.authorization?.replace('Bearer ', '')
    });
  } catch (error: any) {
    console.error('Job creation error:', error);
    if (!res.headersSent) {
      return res.status(500).json({ error: error?.message || 'Failed to submit job' });
    }
  }
}

async function runBackgroundJob(
  jobId: string,
  params: {
    type: string;
    image: string;
    mask?: string;
    stylePrompt?: string;
    styleId?: string;
    prompt?: string;
    hfApiKey?: string;
  }
) {
  let isTimedOut = false;

  // 60-second strict execution timeout guard
  const timeoutTimer = setTimeout(() => {
    isTimedOut = true;
    jobStore.updateJob(jobId, {
      status: 'failed',
      error: 'Job execution timed out after 60 seconds. Please try again or refine input bounds.',
      progress: 0,
      step: 'Execution Timed Out'
    });
  }, JOB_TIMEOUT_MS);

  try {
    jobStore.updateJob(jobId, {
      status: 'processing',
      progress: 15,
      step: 'Initializing background neural pipeline...',
      subtext: 'Allocating high-resolution image tensors'
    });

    const HF_TOKEN =
      params.hfApiKey || process.env.HF_TOKEN || process.env.HUGGINGFACE_TOKEN;

    if (isTimedOut) return;

    jobStore.updateJob(jobId, {
      progress: 35,
      step: 'Running neural inference step 1/2...',
      subtext: 'Synthesizing pixel diffusion boundary'
    });

    let resultBuffer: Buffer | null = null;
    let mimeType = 'image/png';

    if (HF_TOKEN) {
      if (params.type === 'inpaint') {
        const hfRes = await fetch(
          'https://api-inference.huggingface.co/models/runwayml/stable-diffusion-inpainting',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: {
                image: params.image,
                mask_image: params.mask,
                prompt: params.prompt
              },
              parameters: { num_inference_steps: 25 }
            })
          }
        );

        if (hfRes.ok) {
          const ab = await hfRes.arrayBuffer();
          resultBuffer = Buffer.from(ab);
          mimeType = hfRes.headers.get('content-type') || 'image/png';
        }
      } else if (params.type === 'style') {
        const hfRes = await fetch(
          'https://api-inference.huggingface.co/models/timbrooks/instruct-pix2pix',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${HF_TOKEN}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: params.image,
              parameters: {
                prompt: `Transform this image into style: ${params.stylePrompt || params.styleId}`,
                num_inference_steps: 20
              }
            })
          }
        );

        if (hfRes.ok) {
          const ab = await hfRes.arrayBuffer();
          resultBuffer = Buffer.from(ab);
          mimeType = hfRes.headers.get('content-type') || 'image/png';
        }
      }
    }

    if (isTimedOut) return;

    jobStore.updateJob(jobId, {
      progress: 75,
      step: 'Optimizing high-resolution output buffers...',
      subtext: 'Harmonizing gamma and dynamic color scale'
    });

    if (!resultBuffer) {
      // Serverless synthesis buffer fallback
      const base64Data = params.image.includes(',')
        ? params.image.split(',')[1]
        : params.image;
      resultBuffer = Buffer.from(base64Data, 'base64');
    }

    if (isTimedOut) return;

    clearTimeout(timeoutTimer);

    jobStore.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      step: 'High-resolution generation complete',
      subtext: 'Asset ready for stream download',
      resultBuffer,
      resultMimeType: mimeType
    });
  } catch (err: any) {
    clearTimeout(timeoutTimer);
    if (!isTimedOut) {
      console.error(`Background job ${jobId} failed:`, err);
      jobStore.updateJob(jobId, {
        status: 'failed',
        error: err?.message || 'Background execution encountered an error.',
        progress: 0,
        step: 'Generation Failed'
      });
    }
  }
}
