# VPS Mail Worker Deployment Guide

This guide will help you deploy dedicated mail workers on your VPS to handle email sending instead of using Vercel cron jobs.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Application                      │
│                    (Deployed on Vercel)                      │
│                                                              │
│  User → Next.js → POST /api/campaigns/send                  │
│                    ↓                                         │
│              Queue Jobs to Redis                            │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           │ Redis (Upstash or Self-hosted)
                           │
                    ┌──────▼──────┐
                    │  BullMQ     │
                    │  Job Queue  │
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐       ┌────▼────┐       ┌────▼────┐
   │ Worker 1│       │ Worker 2│       │ Worker 3│
   │  (VPS)  │       │  (VPS)  │       │  (VPS)  │
   └─────────┘       └─────────┘       └─────────┘
        │                  │                  │
        └──────────────────┼──────────────────┘
                           │
                    ┌──────▼──────┐
                    │ SMTP Server │
                    │  (Zoho)     │
                    └─────────────┘
```

## Benefits of VPS Workers

1. **Always Running**: Workers continuously process jobs without waiting for cron schedules
2. **Scalable**: Run multiple worker instances to handle high email volumes
3. **Cost Effective**: No serverless function timeouts or cold starts
4. **Reliable**: Automatic retries and graceful error handling
5. **Monitoring**: Real-time logs and process management

## Prerequisites

### On Your VPS

- Node.js 18+ installed
- Either **Docker** OR **PM2** installed
- Access to your VPS via SSH
- At least 512MB RAM (1GB+ recommended)

### Required Services

- Redis instance (Upstash or self-hosted)
- Supabase account (for database)
- SMTP provider (Zoho, SendGrid, etc.)

## Installation Methods

Choose one of the following deployment methods:

### Method 1: Docker Deployment (Recommended)

Docker provides containerization and easy scaling.

#### Step 1: Install Docker on VPS

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt-get install docker-compose-plugin
```

#### Step 2: Clone Your Repository

```bash
cd /var/www
git clone https://github.com/yourusername/wazami-mailer.git
cd wazami-mailer/my-app
```

#### Step 3: Configure Environment

```bash
# Copy and edit environment file
cp .env.worker.example .env
nano .env
```

Fill in your credentials:
```env
NODE_ENV=production
UPSTASH_REDIS_URL=rediss://default:...@your-redis.upstash.io:6379
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_key_here
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=mail@wanzami.tv
SMTP_PASS=your_password
WORKER_CONCURRENCY=5
```

#### Step 4: Deploy with Docker

```bash
# Make scripts executable
chmod +x scripts/*.sh

# Deploy workers
npm run deploy:worker
# OR manually:
docker-compose -f docker-compose.worker.yml up -d --build
```

#### Step 5: Verify Deployment

```bash
# Check container status
docker ps

# View logs
docker-compose -f docker-compose.worker.yml logs -f

# Monitor workers
npm run monitor:worker
```

#### Docker Management Commands

```bash
# View logs
docker-compose -f docker-compose.worker.yml logs -f

# Restart workers
docker-compose -f docker-compose.worker.yml restart

# Stop workers
docker-compose -f docker-compose.worker.yml down

# Scale workers (run 5 instances)
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=5

# Update to latest code
git pull
docker-compose -f docker-compose.worker.yml up -d --build
```

---

### Method 2: PM2 Deployment

PM2 is a process manager for Node.js applications.

#### Step 1: Install PM2

```bash
npm install -g pm2
```

#### Step 2: Clone and Setup

```bash
cd /var/www
git clone https://github.com/yourusername/wazami-mailer.git
cd wazami-mailer/my-app

# Install dependencies
npm install

# Configure environment
cp .env.worker.example .env
nano .env
```

#### Step 3: Build and Deploy

```bash
# Build worker
npm run build:worker

# Start with PM2
npm run worker:pm2
# OR manually:
pm2 start ecosystem.config.js

# Save process list
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Follow the instructions printed by the command above
```

#### Step 4: Monitor

```bash
# View status
pm2 status

# View logs
pm2 logs mail-worker

# Monitor dashboard
pm2 monit

# Or use monitoring script
npm run monitor:worker
```

#### PM2 Management Commands

```bash
# View logs
pm2 logs mail-worker

# Real-time monitoring
pm2 monit

# Restart workers
pm2 restart mail-worker

# Stop workers
pm2 stop mail-worker

# Delete workers
pm2 delete mail-worker

# Scale workers (run 5 instances)
pm2 scale mail-worker 5

# Update to latest code
git pull
npm run build:worker
pm2 restart mail-worker
```

---

## Configuration Options

### Worker Concurrency

Control how many emails each worker processes simultaneously:

**Docker**: Edit `docker-compose.worker.yml`
```yaml
environment:
  - WORKER_CONCURRENCY=5  # Adjust this value
```

**PM2**: Edit `ecosystem.config.js`
```javascript
env: {
  WORKER_CONCURRENCY: '5', // Adjust this value
}
```

### Number of Worker Instances

**Docker**: Scale using docker-compose
```bash
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=3
```

**PM2**: Edit `ecosystem.config.js`
```javascript
instances: 3, // Number of worker processes
```

### Recommended Settings by VPS Size

| VPS RAM | Workers | Concurrency | Total Parallel Jobs |
|---------|---------|-------------|---------------------|
| 512MB   | 1       | 3           | 3                   |
| 1GB     | 2       | 5           | 10                  |
| 2GB     | 3       | 5           | 15                  |
| 4GB+    | 5       | 10          | 50                  |

## Monitoring & Troubleshooting

### Check Worker Status

```bash
# Quick status check
npm run monitor:worker

# Or manually:

# Docker
docker ps
docker-compose -f docker-compose.worker.yml logs --tail=50

# PM2
pm2 status
pm2 logs mail-worker --lines 50
```

### View Real-time Logs

```bash
# Docker
docker-compose -f docker-compose.worker.yml logs -f

# PM2
pm2 logs mail-worker -f
```

### Check Job Queue Status

From your application, hit the status endpoint:
```bash
curl https://your-app.vercel.app/api/queue/status
```

### Common Issues

#### Workers Not Processing Jobs

1. Check Redis connection:
```bash
# Test Redis connectivity
redis-cli -u $UPSTASH_REDIS_URL ping
```

2. Verify environment variables:
```bash
# Docker
docker exec wazami-mail-worker env | grep REDIS

# PM2
pm2 env mail-worker
```

#### High Memory Usage

Reduce concurrency or number of workers:
```bash
# PM2
pm2 scale mail-worker 2
```

#### SMTP Connection Errors

1. Verify SMTP credentials in `.env`
2. Check SMTP provider rate limits
3. Ensure VPS IP is not blacklisted

#### Worker Crashes

Check error logs:
```bash
# Docker
docker-compose -f docker-compose.worker.yml logs mail-worker | grep error

# PM2
pm2 logs mail-worker --err
```

## Security Best Practices

1. **Secure Environment Variables**: Never commit `.env` files
2. **Firewall**: Only allow necessary ports (SSH, HTTP/HTTPS)
3. **SSH Keys**: Use SSH key authentication instead of passwords
4. **Updates**: Keep Node.js, Docker, and PM2 updated
5. **Monitoring**: Set up alerts for worker failures
6. **Backups**: Regular backups of your configuration

## Performance Optimization

### 1. Rate Limiting

Add rate limiting to avoid SMTP provider throttling:

Edit `src/worker/vps-worker.ts`:
```typescript
import { Worker } from 'bullmq';
import pLimit from 'p-limit';

const limit = pLimit(10); // Max 10 emails per second
```

### 2. Connection Pooling

Reuse SMTP connections for better performance:
```typescript
// In mailer.ts
const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
});
```

### 3. Auto-scaling

For Docker deployments, you can auto-scale based on queue length:

```bash
# Check queue length and scale accordingly
QUEUE_LENGTH=$(curl -s https://your-app.vercel.app/api/queue/status | jq '.totals.waiting')

if [ $QUEUE_LENGTH -gt 1000 ]; then
  docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=5
else
  docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=2
fi
```

## Migrating from Vercel Cron

If you're currently using Vercel cron jobs:

1. Deploy VPS workers using this guide
2. Verify workers are processing jobs correctly
3. **Optional**: Disable Vercel cron job in `vercel.json`:
```json
{
  "crons": []
}
```
4. Remove or comment out the `/api/queue/worker.ts` endpoint if no longer needed

## Maintenance

### Regular Updates

```bash
# Navigate to project
cd /var/www/wazami-mailer/my-app

# Pull latest changes
git pull

# Rebuild and restart workers
npm run build:worker

# Docker
docker-compose -f docker-compose.worker.yml up -d --build

# PM2
pm2 restart mail-worker
```

### Log Rotation

**Docker**: Logs are automatically managed by Docker

**PM2**: Configure in `ecosystem.config.js`:
```javascript
{
  max_size: '10M',
  retain: '7',
}
```

## Support

For issues or questions:
1. Check logs first
2. Review [troubleshooting section](#monitoring--troubleshooting)
3. Open an issue on GitHub

## Next Steps

After deployment:
1. Test with a small campaign
2. Monitor worker performance
3. Adjust concurrency based on load
4. Set up monitoring alerts
5. Configure log rotation
6. Schedule regular backups

---

**Congratulations!** Your VPS mail workers are now running and ready to handle email sending at scale.
