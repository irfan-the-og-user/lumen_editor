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

  if (job.status !== 'completed' || !job.resultBuffer) {
    return res.status(400).json({ error: 'Job is not completed yet or result unavailable' });
  }

  res.setHeader('Content-Type', job.resultMimeType || 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  return res.send(job.resultBuffer);
}
