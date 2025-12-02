import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import config from './config';

const connection = new IORedis({
  host: config.redis.host,
  port: config.redis.port,
  maxRetriesPerRequest: null
});

export interface ReportJobData {
  reportId: string;
  email: string;
}

export const reportQueue = new Queue<ReportJobData>('report-queue', {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 }
  }
});

export function createWorker(
  processor: (job: Job<ReportJobData>) => Promise<void>
): Worker<ReportJobData> {
  return new Worker<ReportJobData>('report-queue', processor, {
    connection,
    concurrency: 1, // Process one job at a time for demo visibility
    lockDuration: 60000, // Job is locked for 60 seconds - enough for full processing
    stalledInterval: 5000, // Check for stalled jobs every 5 seconds
    maxStalledCount: 2 // Allow job to be stalled twice before failing
  });
}
