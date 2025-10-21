# VPS Mail Workers - Implementation Summary

## What Was Created

This implementation adds VPS-based service workers to your mail sending system, replacing the need for Vercel cron jobs with always-running dedicated workers.

## Files Created

### 1. Core Worker Implementation
- **[src/worker/vps-worker.ts](src/worker/vps-worker.ts)**: The main worker service that processes email jobs from Redis queue
  - Connects to BullMQ queue
  - Processes jobs concurrently (configurable)
  - Updates Supabase database after sending
  - Handles graceful shutdown
  - Automatic retries on failure

### 2. Deployment Configurations

#### Docker Deployment
- **[Dockerfile.worker](Dockerfile.worker)**: Containerizes the worker service
- **[docker-compose.worker.yml](docker-compose.worker.yml)**: Orchestrates worker containers
  - Environment variable management
  - Resource limits
  - Volume mounts for logs
  - Network configuration

#### PM2 Deployment
- **[ecosystem.config.js](ecosystem.config.js)**: PM2 process manager configuration
  - Cluster mode with multiple instances
  - Auto-restart on crashes
  - Memory limits
  - Log management
  - Error handling

### 3. Build & Configuration
- **[tsconfig.worker.json](tsconfig.worker.json)**: TypeScript config for worker compilation
- **[.env.worker.example](.env.worker.example)**: Template for VPS environment variables
- **Updated [package.json](package.json)**: Added worker-specific scripts

### 4. Deployment & Management Scripts
- **[scripts/deploy-worker.sh](scripts/deploy-worker.sh)**: Automated deployment script
  - Detects Docker or PM2
  - Builds and starts workers
  - Sets up auto-start on boot
  - Displays status and logs

- **[scripts/monitor-workers.sh](scripts/monitor-workers.sh)**: Monitoring dashboard
  - Shows worker status
  - Displays resource usage
  - Recent logs
  - Quick reference commands

### 5. Documentation
- **[VPS-DEPLOYMENT.md](VPS-DEPLOYMENT.md)**: Complete deployment guide (11 sections)
- **[QUICK-START-VPS.md](QUICK-START-VPS.md)**: 5-minute quick start guide
- **This file**: Implementation summary

## Architecture Flow

### Before (Vercel Cron):
```
User → Next.js → Queue Jobs → Redis
                                ↓
                          Vercel Cron (every X minutes)
                                ↓
                          Process 9 jobs
                                ↓
                          SMTP → Email sent
```

**Problems:**
- Cron runs on schedule (not continuous)
- Limited by serverless timeouts
- Small batch sizes (9 jobs)
- Requires CRON_SECRET management

### After (VPS Workers):
```
User → Next.js → Queue Jobs → Redis
                                ↓
                          VPS Workers (always running)
                          │   │   │
                          ▼   ▼   ▼
                         Worker Instances (3x)
                         Each processing 5 jobs concurrently
                                ↓
                          SMTP → Email sent
```

**Benefits:**
- Continuous processing (no delays)
- No serverless timeouts
- Higher throughput (15 concurrent jobs)
- Automatic retries
- Better monitoring

## How It Works

### 1. Job Creation
When a campaign is sent via your Next.js app:
```typescript
// POST /api/campaigns/send
await mailQueue.addBulk([
  { to: 'user1@example.com', subject: '...', html: '...', ... },
  { to: 'user2@example.com', subject: '...', html: '...', ... },
  // ... thousands of jobs
]);
```

### 2. VPS Workers Pick Up Jobs
Multiple worker instances on your VPS continuously poll the Redis queue:
```typescript
// vps-worker.ts automatically processes jobs
worker.on('job', async (job) => {
  await sendMail(job.data);
  await updateDatabase(job.data);
});
```

### 3. Concurrent Processing
Each worker processes multiple jobs simultaneously:
- 3 worker instances × 5 concurrent jobs = **15 emails being sent at once**
- Compare to Vercel cron: 1 cron job × 9 sequential jobs = **9 emails per cron interval**

### 4. Database Updates
After each email is sent:
```sql
UPDATE campaign_subscribers
SET sent = true, sent_at = NOW()
WHERE campaign_id = X AND subscriber_id = Y
```

### 5. Auto-completion
When all jobs are processed, the campaign status updates to "sent" automatically.

## Key Features

### 1. Scalability
- Run 1 to N worker instances
- Each instance processes 1 to N concurrent jobs
- Scale based on your VPS resources

### 2. Reliability
- Automatic retries on failure
- Graceful shutdown (no lost jobs)
- Job persistence in Redis
- Error logging

### 3. Monitoring
```bash
npm run monitor:worker
```
Shows:
- Worker status (running/stopped)
- Resource usage (CPU/memory)
- Recent logs
- Job counts

### 4. Deployment Options
Choose what fits your workflow:
- **Docker**: Containerized, easy scaling
- **PM2**: Direct process management, lighter weight

## Configuration

### Environment Variables

```env
# Required
UPSTASH_REDIS_URL=rediss://...         # Redis queue
NEXT_PUBLIC_SUPABASE_URL=https://...   # Database
SUPABASE_SERVICE_ROLE_KEY=...          # DB auth
SMTP_HOST=smtp.zoho.com                # Email provider
SMTP_PORT=465
SMTP_USER=mail@yourdomain.com
SMTP_PASS=...

# Optional
WORKER_CONCURRENCY=5                   # Jobs per worker
NODE_ENV=production
```

### Scaling Configuration

**For a 1GB VPS (recommended starting point):**
```javascript
// ecosystem.config.js
instances: 2,              // 2 worker processes
env: {
  WORKER_CONCURRENCY: '5'  // 5 jobs each = 10 total
}
```

**For a 4GB VPS (higher volume):**
```javascript
instances: 5,              // 5 worker processes
env: {
  WORKER_CONCURRENCY: '10' // 10 jobs each = 50 total
}
```

## NPM Scripts Added

```json
{
  "build:worker": "tsc --project tsconfig.worker.json",
  "worker:dev": "ts-node src/worker/vps-worker.ts",
  "worker:start": "node dist/worker/vps-worker.js",
  "worker:pm2": "pm2 start ecosystem.config.js",
  "worker:docker": "docker-compose -f docker-compose.worker.yml up -d",
  "deploy:worker": "bash scripts/deploy-worker.sh",
  "monitor:worker": "bash scripts/monitor-workers.sh"
}
```

## Quick Usage

### Local Development
```bash
npm run worker:dev
```

### Production Deployment
```bash
# On your VPS
git clone <repo>
cd my-app
cp .env.worker.example .env
nano .env  # fill in credentials

# Deploy (auto-detects Docker/PM2)
npm run deploy:worker

# Monitor
npm run monitor:worker
```

### Monitoring
```bash
# View status and logs
npm run monitor:worker

# Docker live logs
docker-compose -f docker-compose.worker.yml logs -f

# PM2 live logs
pm2 logs mail-worker
```

### Scaling
```bash
# Docker: Scale to 5 instances
docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=5

# PM2: Scale to 5 instances
pm2 scale mail-worker 5
```

## Migration Path

If you're currently using Vercel cron jobs:

1. **Deploy VPS workers** (workers and cron can coexist)
2. **Test with small campaigns** to verify workers are processing
3. **Monitor for a few days** to ensure stability
4. **Optional: Disable Vercel cron** once confident
   - Remove cron config from `vercel.json`
   - Delete or comment out `/api/queue/worker.ts`

## Performance Comparison

### Vercel Cron (Old)
- Runs every 5 minutes
- Processes 9 jobs per run
- ~108 emails per hour maximum
- Subject to serverless timeouts

### VPS Workers (New)
- Runs continuously
- 3 workers × 5 concurrent = 15 simultaneous jobs
- ~3,600+ emails per hour (assuming 15 sec per email)
- No timeouts
- Scales linearly with resources

## Troubleshooting

### Workers Not Starting
```bash
# Check logs
npm run monitor:worker

# Verify environment
cat .env

# Test Redis connection
redis-cli -u $UPSTASH_REDIS_URL ping
```

### Jobs Not Processing
```bash
# Check queue status (from your Next.js app)
curl https://your-app.vercel.app/api/queue/status

# Check worker logs
docker logs wazami-mail-worker
# or
pm2 logs mail-worker
```

### High Memory Usage
Reduce concurrency:
```bash
# Edit .env or docker-compose
WORKER_CONCURRENCY=3

# Restart workers
docker-compose -f docker-compose.worker.yml restart
# or
pm2 restart mail-worker
```

## Next Steps

1. **Deploy to VPS**: Follow [QUICK-START-VPS.md](QUICK-START-VPS.md)
2. **Test**: Send a small campaign (100-1000 emails)
3. **Monitor**: Watch workers process jobs in real-time
4. **Optimize**: Adjust concurrency/instances based on performance
5. **Scale**: Increase workers as your email volume grows

## Support

- Full deployment guide: [VPS-DEPLOYMENT.md](VPS-DEPLOYMENT.md)
- Quick start: [QUICK-START-VPS.md](QUICK-START-VPS.md)
- Worker code: [src/worker/vps-worker.ts](src/worker/vps-worker.ts)

---

**Your mail workers are ready to deploy!** 🚀
