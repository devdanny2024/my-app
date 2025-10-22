// Test SMTP with port 587 (STARTTLS)
require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('Testing SMTP with Port 587 (STARTTLS)...');
console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('SMTP Port: 587');
console.log('SMTP User:', process.env.SMTP_USER ? '***set***' : 'NOT SET');
console.log('SMTP Pass:', process.env.SMTP_PASS ? '***set***' : 'NOT SET');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.zoho.com',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  connectionTimeout: 10000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
  tls: {
    rejectUnauthorized: false,
  },
  debug: true, // Show debug logs
  logger: true, // Enable logging
});

console.log('\nAttempting to verify SMTP connection on port 587...');

transporter.verify(function (error, success) {
  if (error) {
    console.error('\n❌ SMTP Connection Failed on port 587:');
    console.error(error);
    process.exit(1);
  } else {
    console.log('\n✅ SMTP Server is ready to send emails on port 587');

    // Try sending a test email
    console.log('\nSending test email...');
    transporter.sendMail({
      from: `"Test" <${process.env.SMTP_USER}>`,
      to: process.env.SMTP_USER,
      subject: 'SMTP Test Email - Port 587',
      text: 'Port 587 is working!',
      html: '<p>Port 587 is working!</p>',
    }, (err, info) => {
      if (err) {
        console.error('❌ Failed to send test email:', err);
        process.exit(1);
      } else {
        console.log('✅ Test email sent successfully on port 587!');
        console.log('Message ID:', info.messageId);
        process.exit(0);
      }
    });
  }
});
