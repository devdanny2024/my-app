#!/bin/bash

# Worker monitoring script
# Usage: ./scripts/monitor-workers.sh

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Mail Worker Monitoring Dashboard${NC}"
echo "=================================="

# Check if Docker is being used
if docker ps | grep -q wazami-mail-worker; then
    echo -e "${YELLOW}🐳 Docker Deployment Detected${NC}\n"

    # Container status
    echo -e "${GREEN}Container Status:${NC}"
    docker-compose -f docker-compose.worker.yml ps

    echo -e "\n${GREEN}Container Resource Usage:${NC}"
    docker stats --no-stream wazami-mail-worker

    echo -e "\n${GREEN}Recent Logs (last 20 lines):${NC}"
    docker-compose -f docker-compose.worker.yml logs --tail=20

    echo -e "\n${YELLOW}Commands:${NC}"
    echo "  View live logs: docker-compose -f docker-compose.worker.yml logs -f"
    echo "  Restart workers: docker-compose -f docker-compose.worker.yml restart"
    echo "  Scale workers: docker-compose -f docker-compose.worker.yml up -d --scale mail-worker=5"

# Check if PM2 is being used
elif command -v pm2 &> /dev/null && pm2 list | grep -q mail-worker; then
    echo -e "${YELLOW}⚙️  PM2 Deployment Detected${NC}\n"

    # PM2 status
    echo -e "${GREEN}Worker Status:${NC}"
    pm2 list

    echo -e "\n${GREEN}Worker Details:${NC}"
    pm2 show mail-worker

    echo -e "\n${GREEN}Recent Logs:${NC}"
    pm2 logs mail-worker --lines 20 --nostream

    echo -e "\n${YELLOW}Commands:${NC}"
    echo "  View live logs: pm2 logs mail-worker"
    echo "  Monitor dashboard: pm2 monit"
    echo "  Restart workers: pm2 restart mail-worker"
    echo "  Scale workers: pm2 scale mail-worker <number>"

else
    echo -e "${YELLOW}⚠️  No active workers detected${NC}"
    echo "Run './scripts/deploy-worker.sh' to start workers"
fi

echo ""
