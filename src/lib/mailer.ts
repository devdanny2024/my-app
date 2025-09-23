import nodemailer from 'nodemailer';

type MailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true, // 465 for secure
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendMail({ to, subject, html, text }: MailOptions) {
  try {
    if (!text) {
      // Simple HTML to plain text fallback
      text = html.replace(/<[^>]+>/g, '');
    }

    const info = await transporter.sendMail({
      from: `"Wanzami" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html,
      text,
      replyTo: process.env.SMTP_USER,
      headers: {
        'X-Priority': '3',
        'X-MSMail-Priority': 'Normal',
        Importance: 'Normal',
        'List-Unsubscribe': `<mailto:unsubscribe@wanzami.tv>`,
      },
    });

    console.log(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (err) {
    console.error(`Failed to send email to ${to}`, err);
    throw err;
  }
}
