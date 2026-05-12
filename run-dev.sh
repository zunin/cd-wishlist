#!/bin/bash
set -e

cd "$(dirname "$0")"

echo "=== Building and starting services ==="
docker compose build

echo ""
echo "=== Starting services in background ==="
docker compose up -d

echo ""
echo "=== Waiting for services to be ready ==="
sleep 5

echo ""
echo "=== Checking service status ==="
docker compose ps

echo ""
echo "=== Viewing logs ==="
echo "--- Frontend logs ---"
docker compose logs -f frontend &
FRONTEND_PID=$!

echo "--- Signaling logs ---"
docker compose logs -f signaling &
SIGNALING_PID=$!

sleep 3

kill $FRONTEND_PID $SIGNALING_PID 2>/dev/null || true

echo ""
echo "=== Services are running ==="
echo "Frontend: http://localhost:5173"
echo "Signaling: ws://localhost:4444"
echo ""
echo "To run playwright tests:"
echo "  docker compose exec playwright deno run --allow-all test/playwright-test.ts"
echo ""
echo "To view logs:"
echo "  docker compose logs -f"
echo ""
echo "To stop:"
echo "  docker compose down"