// src/pages/api/campaigns/send.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Queue } from 'bullmq';
import { sendMail } from '../../../lib/mailer'; // adjust path if needed

const connection = {
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
};

const mailQueue = new Queue('mail-queue', { connection });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end('Method Not Allowed');

  try {
    const jobs = await mailQueue.getJobs(['waiting', 'delayed'], 0, 50); // get up to 50 waiting jobs
    let sentCount = 0;

    for (const job of jobs) {
      const { email, subject, html } = job.data;
      if (!email || !subject || !html) continue;

      try {
        await sendMail({ to: email, subject, html });

        if (!job.token) throw new Error('Job token missing');
        await job.moveToCompleted('done', job.token);

        sentCount++;
      } catch (err) {
        if (!job.token) throw new Error('Job token missing');
        await job.moveToFailed(new Error((err as Error).message), job.token);
        console.error('Failed to send email for job', job.id, err);
      }
    }

    return res.status(200).json({ success: true, sent: sentCount });
  } catch (err) {
    console.error('Worker error', err);
    return res.status(500).json({ error: (err as Error).message });
  }
}
