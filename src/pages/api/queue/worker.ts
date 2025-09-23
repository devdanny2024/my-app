// src/pages/api/queue/worker.ts - Process jobs from the queue
import type { NextApiRequest, NextApiResponse } from 'next';
import { Queue, Worker } from 'bullmq';
import { sendMail } from '../../../lib/mailer';
import { supabase } from '../../../lib/supabase';

const connection = {
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
};

const mailQueue = new Queue('mail-queue', { connection });

// This endpoint processes a batch of jobs manually
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { campaignId, batchSize = 10 } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' });

  try {
    // Get waiting jobs for this campaign
    const jobs = await mailQueue.getJobs(['waiting'], 0, batchSize);
    const campaignJobs = jobs.filter(job => job.data.campaignId === campaignId);

    if (campaignJobs.length === 0) {
      // Check if campaign is complete
      const allJobs = await mailQueue.getJobs(['waiting', 'active'], 0, 1000);
      const remainingCampaignJobs = allJobs.filter(job => job.data.campaignId === campaignId);
      
      if (remainingCampaignJobs.length === 0) {
        // Mark campaign as sent
        await supabase
          .from('campaigns')
          .update({ status: 'sent' })
          .eq('id', campaignId);
      }
      
      return res.json({ sent: 0, completed: remainingCampaignJobs.length === 0 });
    }

    let sentCount = 0;
    let failedCount = 0;

    for (const job of campaignJobs) {
      const { email, subject, html, subscriberName } = job.data;
      if (!email || !subject || !html) continue;

      try {
        // Send email
        await sendMail({ 
          to: email, 
          subject, 
          html: html.replace(/\{\{name\}\}/g, subscriberName || 'Subscriber')
        });

        // Mark as sent in database using subscriberId from job data
        if (job.data.subscriberId) {
          await supabase
            .from('campaign_subscribers')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('subscriber_id', job.data.subscriberId);
        }

        await job.remove();
        sentCount++;
        
        console.log(`Sent email to ${email} for campaign ${campaignId}`);
        
      } catch (err) {
        console.error(`Failed to send email to ${email}:`, err);
        
        // Move job to failed with proper BullMQ API
        await job.moveToFailed(err instanceof Error ? err : new Error(String(err)), '0', false);
        failedCount++;
      }
    }

    return res.json({ 
      sent: sentCount, 
      failed: failedCount,
      remaining: campaignJobs.length - sentCount - failedCount
    });

  } catch (err) {
    console.error('Worker processing error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}