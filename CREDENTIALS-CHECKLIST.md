# VPS Deployment Credentials Checklist

Before deploying to your VPS, gather these credentials from your local `.env` file.

## What You Need

### 1. Redis (Upstash)
```
UPSTASH_REDIS_URL=rediss://default:...@driven-cobra-9977.upstash.io:6379
```

**Where to find it:**
- Open your local `.env` file
- Copy the full `UPSTASH_REDIS_URL` value

---

### 2. Supabase

```
NEXT_PUBLIC_SUPABASE_URL=https://wuzwvxwqgojvjljmkbwg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Where to find it:**
- Open your local `.env` file
- Copy both `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`

---

### 3. SMTP (Zoho)

```
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=mail@wanzami.tv
SMTP_PASS=your_password
```

**Where to find it:**
- Open your local `.env` file
- Copy `SMTP_USER` and `SMTP_PASS`

---

## Quick Copy Template

Copy this and fill in your values, then paste into your VPS `.env` file:

```env
NODE_ENV=production

# Redis
UPSTASH_REDIS_URL=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# SMTP
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=

# Worker Config
WORKER_CONCURRENCY=5
```

---

## On Your VPS

Once you have all credentials:

```bash
cd /var/www/wazami-mailer/my-app
nano .env
# Paste the template above with your values filled in
# Ctrl+O to save, Enter to confirm, Ctrl+X to exit
```

---

## Verification

After creating `.env` on VPS, verify it has all required values:

```bash
cat .env | grep -E "UPSTASH_REDIS_URL|SUPABASE_SERVICE_ROLE_KEY|SMTP_PASS"
```

All three should show values (not empty).
