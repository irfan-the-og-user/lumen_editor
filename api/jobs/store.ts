export interface JobRecord {
  id: string;
  type: 'inpaint' | 'style';
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  step: string;
  subtext?: string;
  createdAt: number;
  updatedAt: number;
  resultBuffer?: Buffer;
  resultMimeType?: string;
  error?: string;
  listeners: Array<(job: JobRecord) => void>;
}

class JobStore {
  private jobs = new Map<string, JobRecord>();

  createJob(type: 'inpaint' | 'style'): JobRecord {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const job: JobRecord = {
      id,
      type,
      status: 'queued',
      progress: 0,
      step: 'Task queued in server background queue',
      subtext: 'Awaiting async worker thread',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      listeners: []
    };
    this.jobs.set(id, job);
    return job;
  }

  getJob(id: string): JobRecord | undefined {
    return this.jobs.get(id);
  }

  updateJob(id: string, updates: Partial<JobRecord>) {
    const job = this.jobs.get(id);
    if (!job) return;
    Object.assign(job, updates, { updatedAt: Date.now() });
    for (const listener of [...job.listeners]) {
      try {
        listener(job);
      } catch (e) {
        console.error('Error notifying job listener:', e);
      }
    }
  }

  subscribe(id: string, listener: (job: JobRecord) => void): () => void {
    const job = this.jobs.get(id);
    if (!job) return () => {};
    job.listeners.push(listener);
    return () => {
      job.listeners = job.listeners.filter((l) => l !== listener);
    };
  }
}

const globalStore: JobStore = (global as any).__lumenJobStore || new JobStore();
(global as any).__lumenJobStore = globalStore;

export const jobStore = globalStore;
