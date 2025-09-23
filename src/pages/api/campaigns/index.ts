// my-app/src/pages/api/campaigns/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        template:templates(id, name, subject, body),
        subscribers:campaign_subscribers(subscriber_id)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    const campaigns = (data || []).map((c: any) => ({
      ...c,
      subscriberCount: c.subscribers?.length ?? 0,
      templateName: c.template?.name ?? null,
    }));

    return res.status(200).json(campaigns);
  }

  if (req.method === 'POST') {
    const { name, subject, body, templateId } = req.body;
    if (!name || !subject || !body) return res.status(400).json({ error: 'Missing fields' });

    // Create campaign
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .insert({ name, subject, body, template_id: templateId || null })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Fetch all subscribers
    const { data: subscribers, error: subsError } = await supabase
      .from('subscribers')
      .select('id');

    if (subsError) {
      console.error('Failed to fetch subscribers', subsError);
    }

    let linkedCount = 0;
    if (subscribers?.length) {
      const linkRows = subscribers.map((s: any) => ({
        campaign_id: campaign.id,
        subscriber_id: s.id,
      }));
      const { error: linkError } = await supabase.from('campaign_subscribers').insert(linkRows);
      if (linkError) {
        console.error('Failed to link subscribers', linkError);
      } else {
        linkedCount = linkRows.length;
        console.log(`Linked ${linkedCount} subscribers to campaign ID ${campaign.id}`);
      }
    }

    return res.status(200).json({ ...campaign, linkedSubscribers: linkedCount });
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
