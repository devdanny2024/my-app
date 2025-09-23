"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/worker/mailWorker.ts
require("dotenv/config"); // load .env variables
const bullmq_1 = require("bullmq");
const mailer_1 = require("../lib/mailer");
const worker = new bullmq_1.Worker('mail-queue', async (job) => {
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
        await (0, mailer_1.sendMail)({ to: email, subject, html });
        console.log(`Email sent to ${email}`);
    }
    catch (err) {
        console.error('Failed to send email', err);
        throw err;
    }
}, {
    // Add Redis connection
    connection: {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
    },
});
console.log('Mail worker running...');
exports.default = worker;
