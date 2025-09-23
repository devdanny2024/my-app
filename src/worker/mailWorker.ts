import { Worker } from 'bullmq';
import { sendMail } from '../lib/mailer';

const worker = new Worker('mail-queue', async (job) => {
  if (!job) {
    console.warn('No job found in queue');
    return;
  }

  const email = job.data?.email;
  const subject = job.data?.subject;
  const html = job.data?.html;

  if (!email || !subject || !html) {
    console.warn('Job data missing required fields');
    return;
  }

  try {
    await sendMail({ to: email, subject, html });
    console.log(`Email sent to ${email}`);
  } catch (err) {
    console.error('Failed to send email', err);
    throw err;
  }
});

export default worker;
