// src/pages/api/queue/worker.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { sendMail } from '../../../lib/mailer'; // Your email sending function
import { supabase } from '../../../lib/supabase'; // Your supabase client

// IMPORTANT: Use IORedis for the worker API route, not the REST connection
const connection = new IORedis(process.env.UPSTASH_REDIS_URL!, {
  maxRetriesPerRequest: null,
});

const mailQueue = new Queue('mail-queue', { connection });

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Check for the secret to ensure only Vercel can run this
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 2. Fetch a batch of waiting jobs
  const jobs = await mailQueue.getJobs(['waiting'], 0, 9); // Process 10 at a time

  if (jobs.length === 0) {
    return res.status(200).json({ message: 'No jobs to process.' });
  }

  console.log(`Processing ${jobs.length} jobs...`);
  let sentCount = 0;

  // 3. Process each job
  for (const job of jobs) {
    try {
      const { campaignId, subscriberId, email, subject, html, subscriberName } = job.data;
      
      // Send the email
      await sendMail({
        to: email,
        subject,
        html: html.replace(/\{\{name\}\}/g, subscriberName || 'Subscriber'),
      });
      
      // Update the database
      if (subscriberId) {
        await supabase
          .from('campaign_subscribers')
          .update({ sent: true, sent_at: new Date().toISOString() })
          .eq('campaign_id', campaignId)
          .eq('subscriber_id', subscriberId);
      }

      // Move job to 'completed' state in BullMQ instead of removing
      await job.moveToCompleted('sent successfully', job.token!, false);
      sentCount++;

    } catch (error) {
      console.error(`Job ${job.id} failed with error:`, error);
      await job.moveToFailed(error as Error, job.token!);
    }
  }

  console.log(`Processed ${sentCount} jobs successfully.`);
  return res.status(200).json({ sent: sentCount });
}