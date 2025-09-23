// pages/api/templates/[id].ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: 'Invalid template ID' });
  }

  const templateId = parseInt(id, 10);
  if (isNaN(templateId)) {
    return res.status(400).json({ error: 'Template ID must be a number' });
  }

  try {
    if (req.method === 'PUT') {
      const { name, subject, body } = req.body;
      
      if (!name || !subject || !body) {
        return res.status(400).json({ error: 'Missing required fields: name, subject, body' });
      }

      const { data, error } = await supabase
        .from('templates')
        .update({ name, subject, body })
        .eq('id', templateId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { error } = await supabase
        .from('templates')
        .delete()
        .eq('id', templateId);

      if (error) {
        console.error('Supabase error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}