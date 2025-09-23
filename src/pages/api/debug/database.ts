// src/pages/api/debug/database.ts - Corrected
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).end('Method Not Allowed');

  try {
    const debug = {
      campaigns: null as any,
      subscribers: null as any,
      campaignSubscribers: null as any,
      tableStructure: null as any,
      specificCampaign: null as any // FIX: Add the property to the initial object.
    };

    // 1. Check campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });
    
    debug.campaigns = {
      count: campaigns?.length || 0,
      data: campaigns,
      error: campaignsError
    };

    // 2. Check subscribers
    const { data: subscribers, error: subscribersError } = await supabase
      .from('subscribers')
      .select('*')
      .limit(10);
    
    debug.subscribers = {
      count: subscribers?.length || 0,
      sample: subscribers,
      error: subscribersError
    };

    // 3. Check campaign_subscribers linking table
    const { data: campaignSubs, error: campaignSubsError } = await supabase
      .from('campaign_subscribers')
      .select('*')
      .limit(10);
    
    debug.campaignSubscribers = {
      count: campaignSubs?.length || 0,
      sample: campaignSubs,
      error: campaignSubsError
    };

    // 4. Check campaign_subscribers with joins
    const { data: joinedData, error: joinError } = await supabase
      .from('campaign_subscribers')
      .select(`
        *,
        campaign:campaigns(id, name),
        subscriber:subscribers(id, email, name)
      `)
      .limit(5);

    debug.tableStructure = {
      joinedSample: joinedData,
      joinError: joinError
    };

    // 5. Check specific campaign if provided
    const { campaignId } = req.query;
    if (campaignId) {
      const { data: specificCampaign } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_subscribers(
            subscriber_id,
            subscribers(email, name)
          )
        `)
        .eq('id', campaignId as string)
        .single();
      
      debug.specificCampaign = specificCampaign;
    }

    return res.status(200).json(debug);

  } catch (err) {
    console.error('Debug error:', err);
    return res.status(500).json({ 
      error: (err as Error).message,
      stack: (err as Error).stack 
    });
  }
}