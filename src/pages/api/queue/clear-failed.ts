import { NextApiRequest, NextApiResponse } from 'next';
import { mailQueue } from '../../../lib/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Clean all failed jobs
    await mailQueue.clean(0, 1000, 'failed');

    // Clean all completed jobs
    await mailQueue.clean(0, 1000, 'completed');

    return res.status(200).json({
      success: true,
      message: 'Cleared all failed and completed jobs'
    });
  } catch (error) {
    console.error('Clear failed jobs error:', error);
    return res.status(500).json({ error: 'Failed to clear jobs' });
  }
}
