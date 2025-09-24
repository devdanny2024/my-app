// src/pages/api/campaigns/send.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { mailQueue } from '../../../lib/queue'; // <-- CORRECT: Import the shared queue
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  const { campaignId } = req.body;
  if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' });

  try {
    console.log(`=== DEBUG: Starting send process for campaign ${campaignId} ===`);

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    const { data: campaignSubscribers, error: subsError } = await supabase
      .from('campaign_subscribers')
      .select(`
        subscriber_id,
        sent,
        subscribers!inner(email, name)
      `)
      .eq('campaign_id', campaignId)
      .eq('sent', false);

    if (subsError) {
      console.error('Error fetching subscribers:', subsError);
      return res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
    
    if (!campaignSubscribers || campaignSubscribers.length === 0) {
      return res.status(200).json({ 
        sent: 0, 
        message: 'No subscribers to send to',
      });
    }

    console.log(`Found ${campaignSubscribers.length} subscribers to send to`);

    const jobs = campaignSubscribers.map(sub => {
      const subscriber = (sub as any).subscribers;
      return {
        name: `email-${campaignId}-${subscriber.email}`,
        data: {
          campaignId: campaignId,
          subscriberId: sub.subscriber_id,
          email: subscriber.email,
          subject: campaign.subject,
          html: campaign.body,
          subscriberName: subscriber.name || 'Subscriber'
        }
      };
    });

    // Use the imported mailQueue
    const addedJobs = await mailQueue.addBulk(jobs);

    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    console.log(`Successfully queued ${addedJobs.length} emails for campaign ${campaignId}`);
    
    return res.status(200).json({ 
      success: true, 
      queued: addedJobs.length,
      message: `Queued ${addedJobs.length} emails for sending`,
    });

  } catch (err) {
    console.error('Send campaign error:', err);
    return res.status(500).json({ 
      error: (err as Error).message
    });
  }
}