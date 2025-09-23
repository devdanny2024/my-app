// src/pages/api/campaigns/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Queue } from 'bullmq';
import { supabase } from '../../../lib/supabase';

const connection = {
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
};

const mailQueue = new Queue('mail-queue', { connection });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { campaignId } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' });

  try {
    // First, check if campaign exists and get its details
    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, template:templates(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // Get all subscribers for this campaign who haven't been sent to yet
    const { data: campaignSubscribers, error: subsError } = await supabase
      .from('campaign_subscribers')
      .select(`
        subscriber_id,
        sent,
        subscribers!inner(email, name)
      `)
      .eq('campaign_id', campaignId)
      .eq('sent', false); // assuming you have a 'sent' column

    if (subsError) {
      console.error('Error fetching subscribers:', subsError);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }

    if (!campaignSubscribers || campaignSubscribers.length === 0) {
      return res.status(200).json({ sent: 0, message: 'No subscribers to send to' });
    }

    // Create jobs in the queue for each subscriber
    const jobs = [];
    for (const sub of campaignSubscribers) {
      const subscriber = (sub as any).subscribers;
      if (!subscriber?.email) continue;
      
      jobs.push({
        name: `email-${campaignId}-${subscriber.email}`,
        data: {
          campaignId: campaignId,
          subscriberId: sub.subscriber_id,
          email: subscriber.email,
          subject: campaign.subject,
          html: campaign.body,
          subscriberName: subscriber.name || 'Subscriber'
        }
      });
    }

    // Add jobs to queue
    await mailQueue.addBulk(jobs);

    // Update campaign status to 'sending'
    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    console.log(`Added ${jobs.length} jobs to queue for campaign ${campaignId}`);
    
    return res.status(200).json({ 
      success: true, 
      queued: jobs.length,
      message: `Queued ${jobs.length} emails for sending` 
    });

  } catch (err) {
    console.error('Send campaign error:', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}