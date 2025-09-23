// my-app/src/pages/api/campaigns/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        template:templates(id, name),
        subscribers:campaign_subscribers(subscriber_id)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Map subscriber count
    const campaigns = data.map((c: any) => ({
      ...c,
      subscriberCount: c.subscribers?.length ?? 0,
      templateName: c.template?.name ?? null,
    }));

    return res.status(200).json(campaigns);
  }

  if (req.method === 'POST') {
    const { name, subject, body, templateId, subscriberIds } = req.body;
    if (!name || !subject || !body) return res.status(400).json({ error: 'Missing fields' });

    const { data, error } = await supabase
      .from('campaigns')
      .insert({ name, subject, body, template_id: templateId || null })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    // Link subscribers if provided
    if (subscriberIds?.length) {
      const linkRows = subscriberIds.map((sid: number) => ({
        campaign_id: data.id,
        subscriber_id: sid,
      }));
      const { error: linkError } = await supabase.from('campaign_subscribers').insert(linkRows);
      if (linkError) console.error('Failed to link subscribers', linkError);
    }

    return res.status(200).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
