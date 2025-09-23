import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Fetch campaigns with template info and subscriber count
    const { data, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        template:templates(id, name, subject, body),
        subscriber_count:campaign_subscribers(count)
      `)
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    // Format subscriber count from nested object
    const campaigns = (data || []).map((c: any) => ({
      ...c,
      subscriber_count: c.subscriber_count?.length ?? 0,
    }));

    return res.status(200).json(campaigns);
  }

  if (req.method === 'POST') {
    const { name, subject, body, templateId } = req.body;
    if (!name || !subject || !body) return res.status(400).json({ error: 'Missing fields' });

    const { data, error } = await supabase
      .from('campaigns')
      .insert({
        name,
        subject,
        body,
        template_id: templateId || null,
      })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
