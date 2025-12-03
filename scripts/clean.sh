#!/bin/bash

echo ""
echo "Cleanup Started"
echo "───────────────"
echo ""

echo "→ Clearing database"
docker compose exec -T postgres psql -U postgres -d reports_db -c "TRUNCATE TABLE report_requests;" > /dev/null 2>&1

echo "→ Clearing Redis queue"
docker compose exec -T redis redis-cli FLUSHALL > /dev/null 2>&1

echo "→ Deleting PDF files"
rm -f storage/reports/*.pdf

echo ""
echo "✓ Cleanup complete"
echo ""
