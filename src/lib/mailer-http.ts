// HTTP-based email sender (works even when SMTP ports are blocked)
// Supports multiple providers: Resend, SendGrid, Mailgun

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

// Option 1: Using Resend (Recommended - Simple & Reliable)
export async function sendMailWithResend({ to, subject, html, text }: MailOptions) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY not configured');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: `Wanzami <${process.env.FROM_EMAIL || 'onboarding@resend.dev'}>`,
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Resend API error:`, error);
    throw new Error(`Failed to send email via Resend: ${error}`);
  }

  const data = await response.json();
  console.log(`Email sent via Resend to ${to}:`, data.id);
  return { messageId: data.id };
}

// Option 2: Using SendGrid
export async function sendMailWithSendGrid({ to, subject, html, text }: MailOptions) {
  const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;

  if (!SENDGRID_API_KEY) {
    throw new Error('SENDGRID_API_KEY not configured');
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: to }],
          subject,
        },
      ],
      from: {
        email: process.env.FROM_EMAIL || process.env.SMTP_USER,
        name: 'Wanzami',
      },
      content: [
        {
          type: 'text/plain',
          value: text || html.replace(/<[^>]+>/g, ''),
        },
        {
          type: 'text/html',
          value: html,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`SendGrid API error:`, error);
    throw new Error(`Failed to send email via SendGrid: ${error}`);
  }

  console.log(`Email sent via SendGrid to ${to}`);
  return { messageId: response.headers.get('x-message-id') || 'sent' };
}

// Option 3: Using Mailgun
export async function sendMailWithMailgun({ to, subject, html, text }: MailOptions) {
  const MAILGUN_API_KEY = process.env.MAILGUN_API_KEY;
  const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN;

  if (!MAILGUN_API_KEY || !MAILGUN_DOMAIN) {
    throw new Error('MAILGUN_API_KEY and MAILGUN_DOMAIN not configured');
  }

  const formData = new URLSearchParams();
  formData.append('from', `Wanzami <mailgun@${MAILGUN_DOMAIN}>`);
  formData.append('to', to);
  formData.append('subject', subject);
  formData.append('html', html);
  formData.append('text', text || html.replace(/<[^>]+>/g, ''));

  const response = await fetch(`https://api.mailgun.net/v3/${MAILGUN_DOMAIN}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`api:${MAILGUN_API_KEY}`).toString('base64')}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`Mailgun API error:`, error);
    throw new Error(`Failed to send email via Mailgun: ${error}`);
  }

  const data = await response.json();
  console.log(`Email sent via Mailgun to ${to}:`, data.id);
  return { messageId: data.id };
}

// Smart sender - tries SMTP first, falls back to HTTP if SMTP fails
import { sendMail as sendMailSMTP } from './mailer';

export async function sendMailSmart(options: MailOptions) {
  // Check which service is configured
  if (process.env.RESEND_API_KEY) {
    return sendMailWithResend(options);
  } else if (process.env.SENDGRID_API_KEY) {
    return sendMailWithSendGrid(options);
  } else if (process.env.MAILGUN_API_KEY && process.env.MAILGUN_DOMAIN) {
    return sendMailWithMailgun(options);
  } else {
    // Fall back to SMTP
    return sendMailSMTP(options);
  }
}
