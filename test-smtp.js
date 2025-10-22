// Quick SMTP connection test
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing SMTP Configuration...');
console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('SMTP Port:', process.env.SMTP_PORT);
console.log('SMTP User:', process.env.SMTP_USER ? '***set***' : 'NOT SET');
console.log('SMTP Pass:', process.env.SMTP_PASS ? '***set***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

console.log('\nAttempting to verify SMTP connection...');

transporter.verify(function (error, success) {
  if (error) {
    console.error('\n❌ SMTP Connection Failed:');
    console.error(error);
    process.exit(1);
  } else {
    console.log('\n✅ SMTP Server is ready to send emails');

    // Try sending a test email
    console.log('\nSending test email...');
    transporter.sendMail({
      from: `"Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER, // Send to yourself
      subject: 'SMTP Test Email',
      text: 'If you receive this, SMTP is working correctly!',
      html: '<p>If you receive this, SMTP is working correctly!</p>',
    }, (err, info) => {
      if (err) {
        console.error('❌ Failed to send test email:', err);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully!');
        console.log('Message ID:', info.messageId);
        process.exit(0);
      }
    });
  }
});
