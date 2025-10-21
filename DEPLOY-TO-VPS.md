# Deploy to VPS 151.241.229.165

Follow these steps to deploy the mail workers to your VPS.

## Prerequisites Check

First, connect to your VPS:

```bash
ssh root@151.241.229.165
# or
ssh your-username@151.241.229.165
```

### Step 1: Check Node.js Installation

```bash
node --version
npm --version
```

**If not installed:**
```bash
# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify
node --version
npm --version
```

### Step 2: Check if Docker or PM2 is installed

```bash
# Check Docker
docker --version

# Check PM2
pm2 --version
```

**If neither is installed, install PM2 (simpler):**
```bash
sudo npm install -g pm2
pm2 --version
```

**OR install Docker (recommended for scaling):**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo apt-get install docker-compose-plugin
docker --version
```

---

## Deployment Steps

### Step 3: Clone Your Repository

```bash
# Navigate to web root
cd /var/www

# Clone your repo from GitHub
git clone https://github.com/YOUR-USERNAME/wazami-mailer.git
# Replace YOUR-USERNAME with your actual GitHub username

# Navigate to the app
cd wazami-mailer/my-app
```

### Step 4: Install Dependencies

```bash
npm install
```

### Step 5: Configure Environment Variables

```bash
# Copy the example env file
cp .env.worker.example .env

# Edit the environment file
nano .env
```

**Fill in your credentials:**

```env
NODE_ENV=production

# Redis Queue (from your current .env)
UPSTASH_REDIS_URL=rediss://default:YOUR_PASSWORD@driven-cobra-9977.upstash.io:6379

# Supabase (from your current .env)
NEXT_PUBLIC_SUPABASE_URL=https://wuzwvxwqgojvjljmkbwg.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY_HERE

# SMTP (Zoho - from your current .env)
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=mail@wanzami.tv
SMTP_PASS=YOUR_SMTP_PASSWORD

# Worker Configuration
WORKER_CONCURRENCY=5
```

**Save and exit nano:**
- Press `Ctrl + O` to save
- Press `Enter` to confirm
- Press `Ctrl + X` to exit

### Step 6: Build the Worker

```bash
npm run build:worker
```

This compiles the TypeScript worker to JavaScript in the `dist/` folder.

---

## Choose Your Deployment Method

### Option A: PM2 Deployment (Recommended for Getting Started)

```bash
# Start workers with PM2
npm run worker:pm2
# OR
pm2 start ecosystem.config.js

# Save the PM2 process list
pm2 save

# Setup PM2 to start on server boot
pm2 startup
# Follow the command it prints (usually starts with 'sudo env PATH=...')

# Check status
pm2 status
pm2 logs mail-worker --lines 50
```

**PM2 Commands:**
```bash
# View status
pm2 status

# View logs (live)
pm2 logs mail-worker

# View monitoring dashboard
pm2 monit

# Restart workers
pm2 restart mail-worker

# Stop workers
pm2 stop mail-worker

# Delete workers
pm2 delete mail-worker

# Scale to 5 workers
pm2 scale mail-worker 5
```

---

### Option B: Docker Deployment (Better for Scaling)

```bash
# Start workers with Docker
npm run worker:docker
# OR
docker-compose -f docker-compose.worker.yml up -d --build

# Check status
docker ps

# View logs
docker-compose -f docker-compose.worker.yml logs -f
```

**Docker Commands:**
```bash
# View running containers
docker ps

# View logs (live)
docker-compose -f docker-compose.worker.yml logs -f

# Restart workers
docker-compose -f docker-compose.worker.yml restart

# Stop workers
docker-compose -f docker-compose.worker.yml down

# Scale to 5 workers
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=5

# Rebuild and restart
docker-compose -f docker-compose.worker.yml up -d --build
```

---

## Step 7: Verify Workers Are Running

### Check Worker Logs

**PM2:**
```bash
pm2 logs mail-worker --lines 50
```

**Docker:**
```bash
docker-compose -f docker-compose.worker.yml logs --tail=50
```

**Look for:**
```
[Worker XXXX] Worker is ready and waiting for jobs
```

### Test with Your Application

1. Go to your application: https://your-app.vercel.app
2. Send a test campaign with a few subscribers
3. Watch the logs on your VPS:

**PM2:**
```bash
pm2 logs mail-worker -f
```

**Docker:**
```bash
docker-compose -f docker-compose.worker.yml logs -f
```

**You should see:**
```
[Worker XXXX] Processing job 1 - Sending email to user@example.com
[Worker XXXX] Email sent to user@example.com: <message-id>
[Worker XXXX] Job 1 completed successfully
```

---

## Step 8: Monitor Performance

```bash
# Use the monitoring script
npm run monitor:worker

# OR manually:

# PM2
pm2 monit

# Docker
docker stats
```

---

## Troubleshooting

### Workers Not Starting

**Check environment variables:**
```bash
cat .env
```

**Check logs for errors:**
```bash
# PM2
pm2 logs mail-worker --err

# Docker
docker-compose -f docker-compose.worker.yml logs
```

### Jobs Not Being Processed

**Test Redis connection:**
```bash
# Install redis-tools if not available
sudo apt-get install redis-tools

# Test connection (use your UPSTASH_REDIS_URL)
redis-cli -u "rediss://default:PASSWORD@driven-cobra-9977.upstash.io:6379" ping
# Should return: PONG
```

**Check queue status from your app:**
```bash
curl https://your-app.vercel.app/api/queue/status
```

### Worker Crashes/High Memory

**Reduce concurrency in .env:**
```bash
nano .env
# Change WORKER_CONCURRENCY=5 to WORKER_CONCURRENCY=3
```

**Restart workers:**
```bash
# PM2
pm2 restart mail-worker

# Docker
docker-compose -f docker-compose.worker.yml restart
```

---

## Scaling Your Workers

### For 1GB VPS (Your likely starting point):
```bash
# PM2: Edit ecosystem.config.js
nano ecosystem.config.js
# Change: instances: 2

pm2 delete mail-worker
pm2 start ecosystem.config.js

# Docker: Scale
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=2
```

### For 2GB+ VPS:
```bash
# PM2
nano ecosystem.config.js
# Change: instances: 3

pm2 restart mail-worker

# Docker
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=3
```

---

## Updating Workers (After Code Changes)

```bash
# Navigate to project
cd /var/www/wazami-mailer/my-app

# Pull latest changes from GitHub
git pull

# Install any new dependencies
npm install

# Rebuild worker
npm run build:worker

# Restart workers
# PM2:
pm2 restart mail-worker

# Docker:
docker-compose -f docker-compose.worker.yml up -d --build
```

---

## Security Recommendations

### 1. Setup Firewall

```bash
# Allow SSH, HTTP, HTTPS
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Secure .env File

```bash
chmod 600 /var/www/wazami-mailer/my-app/.env
```

### 3. Create Non-Root User (Recommended)

```bash
adduser mailworker
usermod -aG sudo mailworker
su - mailworker
```

---

## Quick Reference

**Your VPS:** 151.241.229.165

**Project Location:** `/var/www/wazami-mailer/my-app`

**Start Workers:**
```bash
cd /var/www/wazami-mailer/my-app
pm2 start ecosystem.config.js
# OR
docker-compose -f docker-compose.worker.yml up -d
```

**View Logs:**
```bash
pm2 logs mail-worker -f
# OR
docker-compose -f docker-compose.worker.yml logs -f
```

**Monitor:**
```bash
pm2 monit
# OR
npm run monitor:worker
```

**Restart:**
```bash
pm2 restart mail-worker
# OR
docker-compose -f docker-compose.worker.yml restart
```

---

## Success Checklist

- [ ] SSH connected to VPS
- [ ] Node.js installed
- [ ] PM2 or Docker installed
- [ ] Repository cloned
- [ ] Dependencies installed
- [ ] .env configured with all credentials
- [ ] Worker built successfully
- [ ] Workers started (PM2 or Docker)
- [ ] Workers showing "ready and waiting for jobs" in logs
- [ ] Test campaign sent and processed
- [ ] Workers automatically processing emails

---

**You're ready to go!** Your VPS workers will now handle all email sending automatically. 🚀
