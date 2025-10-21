// PM2 ecosystem configuration for VPS deployment
module.exports = {
  apps: [
    {
      name: 'mail-worker',
      script: './dist/worker/vps-worker.js',
      instances: 3, // Run 3 worker instances
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        WORKER_CONCURRENCY: '5', // Each worker processes 5 jobs concurrently
      },
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 4000,
    },
  ],
};
