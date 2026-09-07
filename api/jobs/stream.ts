import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jobStore } from './store';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Missing jobId parameter' });
  }

  const job = jobStore.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  // Set Server-Sent Events headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Send current state immediately
  sendEvent({
    jobId: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    step: job.step,
    subtext: job.subtext,
    error: job.error,
    resultUrl: job.status === 'completed' ? `/api/jobs/result?jobId=${job.id}` : undefined
  });

  if (job.status === 'completed' || job.status === 'failed') {
    res.end();
    return;
  }

  // Subscribe to changes
  const unsubscribe = jobStore.subscribe(jobId, (updatedJob) => {
    sendEvent({
      jobId: updatedJob.id,
      type: updatedJob.type,
      status: updatedJob.status,
      progress: updatedJob.progress,
      step: updatedJob.step,
      subtext: updatedJob.subtext,
      error: updatedJob.error,
      resultUrl: updatedJob.status === 'completed' ? `/api/jobs/result?jobId=${updatedJob.id}` : undefined
    });

    if (updatedJob.status === 'completed' || updatedJob.status === 'failed') {
      unsubscribe();
      res.end();
    }
  });

  req.on('close', () => {
    unsubscribe();
  });
}
