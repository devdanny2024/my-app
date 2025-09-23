// my-app/src/pages/api/campaigns/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../../lib/supabase';
import { mailQueue } from '../../../lib/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  try {
    const { campaignId } = req.body;
    if (!campaignId) return res.status(400).json({ error: 'Missing campaignId' });

    console.log('Fetching campaign with ID:', campaignId);

    // Fetch campaign with subscribers (IDs) and template
    const { data: campaign, error } = await supabase
      .from('campaigns')
      .select(`
        *,
        subscribers:campaign_subscribers(subscriber_id),
        template:templates(id, subject, body)
      `)
      .eq('id', campaignId)
      .single();

    if (error) {
      console.error('Error fetching campaign:', error);
      throw error;
    }
    if (!campaign) {
      console.warn('Campaign not found');
      return res.status(404).json({ error: 'Campaign not found' });
    }

    console.log('Campaign fetched:', campaign);

    const html = campaign.body || campaign.template?.body || '';
    const subject = campaign.subject;

    // Fetch subscriber emails
    const subscriberIds = (campaign.subscribers || []).map((s: any) => s.subscriber_id);
    console.log('Subscriber IDs linked to campaign:', subscriberIds);

    if (subscriberIds.length === 0) {
      console.warn('No subscribers linked to this campaign');
      return res.status(200).json({ success: true, queued: 0 });
    }

    const { data: subscribersData, error: subsError } = await supabase
      .from('subscribers')
      .select('email')
      .in('id', subscriberIds);

    if (subsError) {
      console.error('Error fetching subscriber emails:', subsError);
      throw subsError;
    }

    console.log('Fetched subscriber emails:', subscribersData);

    if (!subscribersData || subscribersData.length === 0) {
      console.warn('No subscriber emails found');
      return res.status(200).json({ success: true, queued: 0 });
    }

    // Enqueue emails
    let queuedCount = 0;
    for (const sub of subscribersData) {
      if (!sub.email) continue;
      console.log('Enqueuing email for:', sub.email);
await mailQueue.add('sendEmail', {
  campaignId, // ✅ track which campaign this email belongs to
  email: sub.email,
  subject,
  html,
});

      queuedCount++;
    }

    console.log(`Total emails queued: ${queuedCount}`);

    return res.status(200).json({ success: true, queued: queuedCount });
  } catch (err) {
    console.error('Failed to send campaign:', err);
    return res.status(500).json({ error: String(err) });
  }
}
