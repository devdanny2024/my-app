// src/lib/queue.ts

import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// This connection will be used by all parts of your app
const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null, // Recommended for serverless environments
});

// Export a single instance of the queue
export const mailQueue = new Queue('mail-queue', { connection });