#!/bin/sh

set -e

cd /app

# Initialize D1 database if not exists
# (In Docker, we use a local SQLite file to simulate D1)
echo "Initializing local state..."
if [ ! -f .wrangler/state/d1.sqlite ]; then
  mkdir -p .wrangler/state
  sqlite3 .wrangler/state/d1.sqlite < init.sql
fi

# Start worker
echo "Starting worker..."
cd /app/worker
npx wrangler dev --port 8787 --test-scheduled --persist-to ../.wrangler/state &
cd /app

# Start pages
echo "Starting pages..."
npx wrangler pages dev ./static --port 8788 --persist-to .wrangler/state &

# Set up cron to trigger worker every minute
echo "Setting up cron..."
echo "* * * * * curl -s http://localhost:8787/__scheduled?cron=*+*+*+*+* > /dev/null 2>&1" | crontab -
crond -b -l 0

echo "=========================================="
echo "UptimeFlare running!"
echo "  Worker API:  http://localhost:8787"
echo "  Status Page: http://localhost:8788"
echo "=========================================="

# Wait for any process to exit
wait
