import type { NextApiRequest, NextApiResponse } from "next";
import { Queue } from "bullmq";
import { sendMail } from "../lib/mailer";

const connection = {
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
};

const mailQueue = new Queue("mail-queue", { connection });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).end("Method Not Allowed");

  const { campaignId } = req.body;
  if (!campaignId) return res.status(400).json({ error: "Missing campaignId" });

  try {
    // Get up to 20 waiting jobs
    const jobs = await mailQueue.getJobs(["waiting"], 0, 50);

    // Filter jobs for this campaign
    const campaignJobs = jobs.filter((job) => job.data.campaignId === campaignId);

    if (campaignJobs.length === 0) return res.json({ sent: 0 });

    let sentCount = 0;

    for (const job of campaignJobs) {
      const { email, subject, html } = job.data;
      if (!email || !subject || !html) continue;

      try {
        await sendMail({ to: email, subject, html });
        await job.remove(); // remove from queue
        sentCount++;
      } catch (err) {
        console.error("Failed to send email for job", job.id, err);
        // optionally move to failed queue
      }
    }

    res.status(200).json({ sent: sentCount });
  } catch (err) {
    console.error("Worker error", err);
    res.status(500).json({ error: (err as Error).message });
  }
}
