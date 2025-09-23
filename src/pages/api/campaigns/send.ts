// src/pages/api/campaigns/send.ts - Corrected
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
    console.log(`=== DEBUG: Starting send process for campaign ${campaignId} ===`);

    const { data: campaign, error: campaignError } = await supabase
      .from('campaigns')
      .select('*, template:templates(*)')
      .eq('id', campaignId)
      .single();

    if (campaignError || !campaign) {
      return res.status(404).json({ error: 'Campaign not found' });
    }

    // FIX 1 & 2: Remove the generic from rpc() and cast the resulting data instead.
    const { data } = await supabase
      .rpc('get_table_columns', { table_name: 'campaign_subscribers' })
      .single();
    const tableInfo = data as { columns: string[] } | null;
    const hasSentColumn = tableInfo?.columns?.includes('sent');
    
    console.log('Table has sent column:', hasSentColumn);

    let query = supabase
      .from('campaign_subscribers')
      .select(`
        subscriber_id,
        sent,
        subscribers!inner(email, name)
      `)
      .eq('campaign_id', campaignId);

    if (hasSentColumn) {
      query = query.eq('sent', false);
    }

    let { data: campaignSubscribers, error: subsError } = await query;

    if (subsError) {
      console.error('Error fetching subscribers:', subsError);
      
      console.log('Trying fallback query without sent filter...');
      const { data: fallbackSubs, error: fallbackError } = await supabase
        .from('campaign_subscribers')
        .select(`
          subscriber_id,
          subscribers!inner(email, name)
        `)
        .eq('campaign_id', campaignId);
      
      if (fallbackError) {
        return res.status(500).json({ error: 'Failed to fetch subscribers', details: fallbackError });
      }
      
      // FIX 3: Add the missing 'sent' property to the fallback data to match the expected type.
      if (fallbackSubs) {
        campaignSubscribers = fallbackSubs.map(sub => ({
          ...sub,
          sent: false, // Add default 'sent' property
        }));
      }
    }

    if (!campaignSubscribers || campaignSubscribers.length === 0) {
      return res.status(200).json({ 
        sent: 0, 
        message: 'No subscribers to send to',
      });
    }

    console.log(`Found ${campaignSubscribers.length} subscribers to send to`);

    const jobs = [];
    for (const sub of campaignSubscribers) {
      const subscriber = (sub as any).subscribers;
      if (!subscriber?.email) {
        console.log('Skipping subscriber - no email:', sub);
        continue;
      }
      
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

    if (jobs.length === 0) {
      return res.status(200).json({ 
        sent: 0, 
        message: 'No valid email addresses found',
        debug: { subscribersFound: campaignSubscribers.length }
      });
    }

    const addedJobs = await mailQueue.addBulk(jobs);

    await supabase
      .from('campaigns')
      .update({ status: 'sending' })
      .eq('id', campaignId);

    console.log(`Successfully queued ${jobs.length} emails for campaign ${campaignId}`);
    
    return res.status(200).json({ 
      success: true, 
      queued: addedJobs.length,
      message: `Queued ${addedJobs.length} emails for sending`,
    });

  } catch (err) {
    console.error('Send campaign error:', err);
    return res.status(500).json({ 
      error: (err as Error).message,
      stack: (err as Error).stack 
    });
  }
}