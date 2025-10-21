# Quick Start: VPS Worker Deployment

This is a condensed version of the deployment guide. For full details, see [VPS-DEPLOYMENT.md](./VPS-DEPLOYMENT.md).

## Setup (5 minutes)

### 1. On Your VPS

```bash
# Clone repo
cd /var/www
git clone <your-repo-url>
cd wazami-mailer/my-app

# Copy and configure environment
cp .env.worker.example .env
nano .env  # Fill in your credentials
```

### 2. Choose Deployment Method

#### Option A: Docker (Recommended)

```bash
# Install Docker (if not installed)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Deploy workers
npm run deploy:worker
# OR
docker-compose -f docker-compose.worker.yml up -d --build

# Check status
docker ps
npm run monitor:worker
```

#### Option B: PM2

```bash
# Install PM2 (if not installed)
npm install -g pm2

# Install dependencies and build
npm install
npm run build:worker

# Deploy workers
npm run worker:pm2
# OR
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Check status
pm2 status
npm run monitor:worker
```

## Environment Variables

Required in `.env`:

```env
NODE_ENV=production
UPSTASH_REDIS_URL=rediss://your-redis-url
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
SMTP_HOST=smtp.zoho.com
SMTP_PORT=465
SMTP_USER=mail@yourdomain.com
SMTP_PASS=your-password
WORKER_CONCURRENCY=5
```

## Quick Commands

### Monitoring
```bash
npm run monitor:worker          # Status dashboard
docker logs -f wazami-mail-worker  # Docker logs
pm2 logs mail-worker            # PM2 logs
```

### Management
```bash
# Docker
docker-compose -f docker-compose.worker.yml restart  # Restart
docker-compose -f docker-compose.worker.yml down     # Stop
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=5  # Scale

# PM2
pm2 restart mail-worker         # Restart
pm2 stop mail-worker           # Stop
pm2 scale mail-worker 5        # Scale
```

### Updates
```bash
git pull
npm run build:worker

# Docker
docker-compose -f docker-compose.worker.yml up -d --build

# PM2
pm2 restart mail-worker
```

## Recommended Settings

| VPS RAM | Workers | Concurrency | Parallel Jobs |
|---------|---------|-------------|---------------|
| 512MB   | 1       | 3           | 3             |
| 1GB     | 2       | 5           | 10            |
| 2GB     | 3       | 5           | 15            |
| 4GB+    | 5       | 10          | 50            |

## Troubleshooting

**Workers not processing?**
- Check Redis connection: `redis-cli -u $UPSTASH_REDIS_URL ping`
- Verify environment variables
- Check logs for errors

**High memory usage?**
- Reduce `WORKER_CONCURRENCY`
- Reduce number of worker instances

**SMTP errors?**
- Verify credentials in `.env`
- Check provider rate limits

## Architecture

```
Your Next.js App (Vercel)
    ↓
  Redis Queue (Upstash)
    ↓
VPS Workers (3 instances)
    ↓
SMTP Provider (Zoho)
```

Each worker processes jobs continuously without needing Vercel cron schedules.

## Next Steps

1. Test with a small campaign
2. Monitor performance
3. Adjust concurrency/instances based on load
4. Set up monitoring alerts

For complete documentation, see [VPS-DEPLOYMENT.md](./VPS-DEPLOYMENT.md).
