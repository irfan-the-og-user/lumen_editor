import type { VercelRequest, VercelResponse } from '@vercel/node';
import { jobStore } from './store';

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid jobId parameter' });
  }

  const job = jobStore.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found or expired' });
  }

  return res.status(200).json({
    jobId: job.id,
    type: job.type,
    status: job.status,
    progress: job.progress,
    step: job.step,
    subtext: job.subtext,
    error: job.error,
    resultUrl: job.status === 'completed' ? `/api/jobs/result?jobId=${job.id}` : undefined,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt
  });
}
