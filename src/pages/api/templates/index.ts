// pages/api/templates/index.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('Templates API called with method:', req.method);
  
  try {
    // Test 1: Basic response
    if (req.query.test === 'basic') {
      return res.status(200).json({ message: 'API is working', timestamp: new Date().toISOString() });
    }
    
    // Test 2: Supabase connection
    if (req.query.test === 'supabase') {
      console.log('Testing Supabase connection...');
      const { data, error } = await supabase
        .from('templates')
        .select('count(*)')
        .single();
      
      if (error) {
        console.error('Supabase connection error:', error);
        return res.status(500).json({ 
          error: 'Supabase connection failed', 
          details: error.message,
          hint: error.hint,
          code: error.code 
        });
      }
      
      return res.status(200).json({ message: 'Supabase connected', data });
    }

    if (req.method === 'GET') {
      console.log('Fetching templates...');
      
      // Check if table exists first
      const { data, error, count } = await supabase
        .from('templates')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false });

      console.log('Supabase response:', { data, error, count });

      if (error) {
        console.error('Supabase query error:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        
        return res.status(500).json({ 
          error: 'Database query failed',
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
      }
      
      console.log(`Successfully fetched ${count} templates`);
      return res.status(200).json(data || []);
    }

    if (req.method === 'POST') {
      console.log('Creating template with body:', req.body);
      
      const { name, subject, body } = req.body;
      
      if (!name || !subject || !body) {
        console.error('Missing fields:', { name: !!name, subject: !!subject, body: !!body });
        return res.status(400).json({ error: 'Missing required fields: name, subject, body' });
      }

      const { data, error } = await supabase
        .from('templates')
        .insert({ name, subject, body })
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error);
        return res.status(500).json({ 
          error: 'Failed to create template',
          message: error.message,
          details: error.details,
          hint: error.hint
        });
      }
      
      console.log('Template created:', data);
      return res.status(200).json(data);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    
  } catch (err) {
    console.error('Unexpected API error:', err);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }
}