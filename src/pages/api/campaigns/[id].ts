// my-app/src/pages/api/campaigns/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;

  if (req.method === 'PUT') {
    const { name, subject, body, template_id, status } = req.body;
    const { data, error } = await supabase
      .from('campaigns')
      .update({ name, subject, body, template_id, status })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json(data);
  }

  if (req.method === 'DELETE') {
    // First delete related campaign_subscribers
    await supabase
      .from('campaign_subscribers')
      .delete()
      .eq('campaign_id', id);

    // Then delete the campaign
    const { error } = await supabase.from('campaigns').delete().eq('id', id);
    if (error) return res.status(500).json({ error: error.message });
    return res.status(200).json({ success: true });
  }

  res.setHeader('Allow', ['PUT', 'DELETE']);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}
