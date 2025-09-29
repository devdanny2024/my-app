import type { NextApiRequest, NextApiResponse } from 'next';
import { mailQueue } from '../../../lib/queue';
import { sendMail } from '../../../lib/mailer';
import { supabase } from '../../../lib/supabase';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    // Fetch waiting jobs (you can adjust the limit)
    const jobs = await mailQueue.getJobs(['waiting', 'active'], 0, 50);

    if (jobs.length === 0) {
      return res.status(200).json({ 
        message: 'No jobs to process.',
        processed: 0 
      });
    }

    console.log(`Processing ${jobs.length} jobs...`);
    let sentCount = 0;
    let failedCount = 0;

    // Process each job
    for (const job of jobs) {
      try {
        const { campaignId, subscriberId, email, subject, html, subscriberName } = job.data;

        if (!email || !subject || !html) {
          console.warn(`Job ${job.id} missing required data`);
          await job.moveToFailed(new Error('Missing required data'), job.token!);
          failedCount++;
          continue;
        }

        // Send the email
        await sendMail({
          to: email,
          subject,
          html: html.replace(/\{\{name\}\}/g, subscriberName || 'Subscriber'),
        });

        // Update database
        if (subscriberId && campaignId) {
          await supabase
            .from('campaign_subscribers')
            .update({ sent: true, sent_at: new Date().toISOString() })
            .eq('campaign_id', campaignId)
            .eq('subscriber_id', subscriberId);
        }

        // Mark job as completed
        await job.moveToCompleted('sent successfully', job.token!, false);
        sentCount++;

      } catch (error) {
        console.error(`Job ${job.id} failed:`, error);
        await job.moveToFailed(error as Error, job.token!);
        failedCount++;
      }
    }

    // Check if all jobs for any campaign are done and update status
    const campaignIds = new Set(jobs.map(j => j.data.campaignId).filter(Boolean));
    
    for (const campaignId of campaignIds) {
      const remainingJobs = await mailQueue.getJobs(['waiting', 'active']);
      const campaignJobsRemaining = remainingJobs.filter(j => j.data.campaignId === campaignId);
      
      if (campaignJobsRemaining.length === 0) {
        await supabase
          .from('campaigns')
          .update({ status: 'sent' })
          .eq('id', campaignId);
        
        console.log(`Campaign ${campaignId} marked as sent`);
      }
    }

    console.log(`Processed ${sentCount} jobs successfully, ${failedCount} failed.`);
    return res.status(200).json({ 
      processed: sentCount + failedCount,
      sent: sentCount,
      failed: failedCount,
      message: `Successfully sent ${sentCount} emails${failedCount > 0 ? `, ${failedCount} failed` : ''}`
    });

  } catch (error) {
    console.error('Worker error:', error);
    return res.status(500).json({ 
      error: (error as Error).message 
    });
  }
}