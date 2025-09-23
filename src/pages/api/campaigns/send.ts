// my-app/src/pages/api/campaigns/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end(`Method ${req.method} Not Allowed`);

  try {
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' });

    // Fetch campaign with subscribers
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        subscribers:campaign_subscribers(subscriber_id),
        template:templates(id, subject, body)
      `)
      .eq('id', campaignId)
      .single();

    if (error) throw error;

    // Here you would enqueue to your worker or send emails
    console.log('Ready to send campaign to subscribers:', campaign.subscribers?.length);

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: String(err) });
  }
}
