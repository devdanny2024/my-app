// src/pages/api/queue/status.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { Job } from 'bullmq';
import { mailQueue } from '../../../lib/queue';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // 1. Efficiently get TOTAL counts for finished jobs
    const totalCounts = await mailQueue.getJobCounts(
      'completed',
      'failed'
    );

    // 2. Get the full job data ONLY for jobs that are in-progress
    const waitingJobs = await mailQueue.getJobs(['waiting']);
    const activeJobs = await mailQueue.getJobs(['active']);

    // 3. Group the in-progress jobs by campaignId
    const groupByCampaign = (jobs: Job[]) =>
      jobs.reduce((acc: Record<string, number>, job) => {
        const id = job.data.campaignId;
        if (!id) return acc;
        acc[id] = (acc[id] || 0) + 1;
        return acc;
      }, {});

    // 4. Combine the results into a single object for the UI
    const allCampaignIds = new Set([
      ...Object.keys(groupByCampaign(waitingJobs)),
      ...Object.keys(groupByCampaign(activeJobs)),
    ]);
    
    const status: Record<string, { waiting: number; active: number; completed: number; failed: number }> = {};

    allCampaignIds.forEach(id => {
        status[id] = {
            waiting: 0,
            active: 0,
            completed: 0, // We can't get per-campaign completed counts efficiently
            failed: 0, // Same for failed
        };
    });

    for (const job of waitingJobs) {
        if(job.data.campaignId) status[job.data.campaignId].waiting++;
    }
    for (const job of activeJobs) {
        if(job.data.campaignId) status[job.data.campaignId].active++;
    }

    // Note: We are now returning totals for completed/failed, not per-campaign, for performance.
    // Your UI will need to be adjusted to display this.
    res.status(200).json({
      details: status,
      totals: totalCounts
    });

  } catch (err) {
    console.error('Error fetching queue status:', err);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
}