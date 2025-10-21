import { Worker, Job } from 'bullmq';
import { sendMail } from '../lib/mailer';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const REDIS_URL = process.env.UPSTASH_REDIS_URL || '';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

interface MailJobData {
  email: string;
  subject: string;
  html: string;
  subscriberId: number;
  campaignId: number;
  subscriberName?: string;
}

// Create the worker
const worker = new Worker(
  'mail-queue',
  async (job: Job<MailJobData>) => {
    const { email, subject, html, subscriberId, campaignId } = job.data;

    try {
      console.log(`[Worker ${process.pid}] Processing job ${job.id} - Sending email to ${email}`);

      // Send the email
      const info = await sendMail({
        to: email,
        subject,
        html,
      });

      console.log(`[Worker ${process.pid}] Email sent to ${email}:`, info.messageId);

      // Update the database to mark this email as sent
      const { error } = await supabase
        .from('campaign_subscribers')
        .update({
          sent: true,
          sent_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaignId)
        .eq('subscriber_id', subscriberId);

      if (error) {
        console.error(`[Worker ${process.pid}] Database update error:`, error);
        throw new Error(`Failed to update database: ${error.message}`);
      }

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`[Worker ${process.pid}] Failed to send email to ${email}:`, error);
      throw error; // BullMQ will handle retries
    }
  },
  {
    connection: {
      url: REDIS_URL,
      tls: REDIS_URL.startsWith('rediss://') ? {} : undefined,
    },
    concurrency: WORKER_CONCURRENCY,
    removeOnComplete: {
      count: 1000, // Keep last 1000 completed jobs
      age: 24 * 3600, // Keep completed jobs for 24 hours
    },
    removeOnFail: {
      count: 5000, // Keep last 5000 failed jobs for debugging
    },
  }
);

// Event handlers for monitoring
worker.on('completed', (job) => {
  console.log(`[Worker ${process.pid}] Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker ${process.pid}] Job ${job?.id} failed:`, err.message);
});

worker.on('error', (err) => {
  console.error(`[Worker ${process.pid}] Worker error:`, err);
});

worker.on('ready', () => {
  console.log(`[Worker ${process.pid}] Worker is ready and waiting for jobs`);
});

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log(`[Worker ${process.pid}] Shutting down gracefully...`);
  await worker.close();
  console.log(`[Worker ${process.pid}] Worker closed`);
  process.exit(0);
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

console.log(`[Worker ${process.pid}] Mail worker started with concurrency ${WORKER_CONCURRENCY}`);

export default worker;
