import type { NextApiRequest, NextApiResponse } from 'next';
import { mailQueue } from '../../../lib/queue';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const waitingJobs = await mailQueue.getWaiting();
    const activeJobs = await mailQueue.getActive();
    const completedJobs = await mailQueue.getCompleted();
    const failedJobs = await mailQueue.getFailed();

    // Group counts by campaignId
    const groupByCampaign = (jobs: any[]) =>
      jobs.reduce((acc: Record<string, number>, job) => {
        const id = job.data.campaignId;
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

    res.status(200).json({
      waiting: groupByCampaign(waitingJobs),
      active: groupByCampaign(activeJobs),
      completed: groupByCampaign(completedJobs),
      failed: groupByCampaign(failedJobs),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: String(err) });
  }
}
