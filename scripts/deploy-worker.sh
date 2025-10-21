#!/bin/bash

# Deployment script for VPS mail workers
# Usage: ./scripts/deploy-worker.sh

set -e

echo "🚀 Starting mail worker deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}Error: .env file not found${NC}"
    exit 1
fi

# Load environment variables
export $(cat .env | grep -v '^#' | xargs)

# Build the project
echo -e "${YELLOW}📦 Building TypeScript files...${NC}"
npm run build:worker

# Option 1: Docker deployment
if command -v docker &> /dev/null; then
    echo -e "${YELLOW}🐳 Docker detected. Building and starting containers...${NC}"

    # Build and start containers
    docker-compose -f docker-compose.worker.yml up -d --build

    # Check container status
    echo -e "${GREEN}✅ Checking container status...${NC}"
    docker-compose -f docker-compose.worker.yml ps

    # Show logs
    echo -e "${YELLOW}📋 Recent logs:${NC}"
    docker-compose -f docker-compose.worker.yml logs --tail=50

    echo -e "${GREEN}✅ Docker deployment complete!${NC}"
    echo -e "${YELLOW}To view logs: docker-compose -f docker-compose.worker.yml logs -f${NC}"
    echo -e "${YELLOW}To stop workers: docker-compose -f docker-compose.worker.yml down${NC}"

# Option 2: PM2 deployment
elif command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚙️  PM2 detected. Starting workers...${NC}"

    # Create logs directory
    mkdir -p logs

    # Stop existing workers
    pm2 delete mail-worker 2>/dev/null || true

    # Start workers with PM2
    pm2 start ecosystem.config.js

    # Save PM2 process list
    pm2 save

    # Setup PM2 startup script
    echo -e "${YELLOW}Setting up PM2 to start on boot...${NC}"
    pm2 startup

    # Show status
    pm2 status

    echo -e "${GREEN}✅ PM2 deployment complete!${NC}"
    echo -e "${YELLOW}To view logs: pm2 logs mail-worker${NC}"
    echo -e "${YELLOW}To monitor: pm2 monit${NC}"
    echo -e "${YELLOW}To stop workers: pm2 stop mail-worker${NC}"

else
    echo -e "${RED}Error: Neither Docker nor PM2 found${NC}"
    echo -e "${YELLOW}Please install Docker or PM2:${NC}"
    echo -e "  Docker: https://docs.docker.com/get-docker/"
    echo -e "  PM2: npm install -g pm2"
    exit 1
fi

echo -e "${GREEN}🎉 Deployment complete!${NC}"
