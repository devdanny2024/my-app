# SMTP Port Blocking Fix - VPS Email Sending Solution

## Problem
Your VPS is blocking outbound SMTP connections on ports 465, 587, and 25. This is common for VPS providers to prevent spam.

## Solution: Use HTTP-Based Email API

I've updated the worker to support HTTP-based email services that work even when SMTP ports are blocked.

---

## Option 1: Resend (Recommended - Free & Easy)

### Why Resend?
- ✅ **3,000 free emails/month**
- ✅ **Simple HTTP API** (not blocked by VPS)
- ✅ **Great deliverability**
- ✅ **Easy setup** (5 minutes)

### Setup Steps:

**1. Sign up for Resend**
- Go to https://resend.com
- Create a free account
- Verify your email

**2. Get API Key**
- Go to https://resend.com/api-keys
- Click "Create API Key"
- Copy the key (starts with `re_...`)

**3. Add Domain (Optional but recommended)**
- Go to https://resend.com/domains
- Add your domain
- Add the DNS records they provide
- Or use their test domain for now

**4. Update VPS Environment Variables**

SSH into your VPS and edit `.env`:
```bash
cd /var/www/my-app
nano .env
```

Add this line:
```bash
RESEND_API_KEY=re_your_actual_api_key_here
FROM_EMAIL=noreply@yourdomain.com
```

**5. Deploy Updated Code**
```bash
cd /var/www/my-app
git pull origin main
npm install
npm run build:worker
pm2 restart mail-worker
pm2 logs mail-worker
```

**6. Test Email Sending**
- Go to your app and create a campaign
- Click "Send Now"
- Emails should now send successfully via Resend!

---

## Option 2: SendGrid (Alternative)

### Setup Steps:

**1. Sign up for SendGrid**
- Go to https://sendgrid.com
- Free tier: 100 emails/day

**2. Get API Key**
- Go to Settings → API Keys
- Create a new API key with "Mail Send" permission
- Copy the key (starts with `SG.`)

**3. Update VPS `.env`**
```bash
SENDGRID_API_KEY=SG.your_actual_api_key_here
FROM_EMAIL=your-verified-email@domain.com
```

**4. Verify Sender Email**
- Go to Settings → Sender Authentication
- Verify your email address or domain

**5. Deploy**
```bash
cd /var/www/my-app
git pull origin main
npm install
npm run build:worker
pm2 restart mail-worker
```

---

## Option 3: Mailgun (Alternative)

### Setup Steps:

**1. Sign up for Mailgun**
- Go to https://www.mailgun.com
- Free tier: 5,000 emails/month for 3 months

**2. Get API Key**
- Go to Settings → API Keys
- Copy your Private API key

**3. Get Domain**
- Go to Sending → Domains
- Use sandbox domain or add your own

**4. Update VPS `.env`**
```bash
MAILGUN_API_KEY=your_mailgun_api_key
MAILGUN_DOMAIN=your-domain.com
FROM_EMAIL=noreply@your-domain.com
```

**5. Deploy**
```bash
cd /var/www/my-app
git pull origin main
npm install
npm run build:worker
pm2 restart mail-worker
```

---

## Testing

### Test Port Connectivity (Optional)
```bash
cd /var/www/my-app
chmod +x test-ports.sh
./test-ports.sh
```

This will show which SMTP ports are blocked.

### Test Email Sending
```bash
# For port 587 SMTP test
node test-smtp-587.js

# Or just restart workers and send a campaign
pm2 restart mail-worker
pm2 logs mail-worker --lines 50
```

---

## How It Works

The updated worker (`src/worker/vps-worker.ts`) now uses `sendMailSmart()` which:

1. **Checks for Resend API key** → Uses Resend HTTP API
2. **Checks for SendGrid API key** → Uses SendGrid HTTP API
3. **Checks for Mailgun API key** → Uses Mailgun HTTP API
4. **Falls back to SMTP** → Uses your Zoho SMTP (if ports aren't blocked)

---

## Files Changed

- ✅ `src/lib/mailer-http.ts` - New HTTP-based email senders
- ✅ `src/worker/vps-worker.ts` - Updated to use smart mailer
- ✅ `src/lib/mailer.ts` - Improved SMTP config with better timeouts
- ✅ `test-smtp-587.js` - Test script for port 587
- ✅ `test-ports.sh` - Port connectivity checker

---

## Quick Start (Resend)

**TL;DR - 3 commands:**
```bash
# 1. Get Resend API key from https://resend.com/api-keys
# 2. Add to .env
echo "RESEND_API_KEY=re_your_key" >> .env
echo "FROM_EMAIL=noreply@yourdomain.com" >> .env

# 3. Deploy
git pull && npm install && npm run build:worker && pm2 restart mail-worker
```

---

## Support

If you have any issues:
1. Check `pm2 logs mail-worker` for error messages
2. Verify API key is set: `cat .env | grep RESEND_API_KEY`
3. Test connectivity: `node test-smtp-587.js`
4. Check Resend dashboard for delivery status

---

**Recommended:** Use Resend - it's the fastest to set up and most reliable for your use case.
