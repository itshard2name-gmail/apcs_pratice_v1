#!/bin/bash

# Configuration
COMPOSE_FILE="docker-compose.stage.yml"
PROJECT_NAME="apcs_stage"

echo "---------------------------------------------------"
echo "🚀 Starting APCS Platform Local Stage with Cloudflare"
echo "---------------------------------------------------"

# Load Environment Variables from .envrc
if [ -f ".envrc" ]; then
    echo "Loading environment variables from .envrc..."
    source .envrc
fi

# 1. Stop existing containers to ensure a fresh start or update
echo "Stopping any existing stage containers..."
docker compose -f $COMPOSE_FILE -p $PROJECT_NAME down --remove-orphans

# 2. Start the stack
echo "Building and starting stage stack..."
# Ensure server/.env exists or warn
if [ ! -f "server/.env" ]; then
    echo "⚠️  WARNING: server/.env file not found. Gemini API features may not work."
fi

docker compose -f $COMPOSE_FILE -p $PROJECT_NAME up -d --build

# 3. Wait for Tunnel
echo "Waiting for Cloudflare Tunnel to establish (allow ~10-15 seconds)..."
sleep 5
echo -n "."
sleep 5
echo -n "."
sleep 5
echo ""

# 4. Fetch the URL
echo "🔍  Fetching your public URL..."

# Attempt to find the URL in the logs. 
# Cloudflared outputs: "INF |  https://<random>.trycloudflare.com   |"
URL=$(docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs tunnel 2>&1 | grep -o 'https://.*\.trycloudflare\.com' | head -n 1)

if [ -z "$URL" ]; then
    echo "⚠️  URL not found yet. It might still be connecting."
    echo "Here are the last 20 lines of the tunnel logs:"
    echo "---------------------------------------------------"
    docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs --tail=20 tunnel
    echo "---------------------------------------------------"
    echo " Please check manually with: docker compose -f $COMPOSE_FILE -p $PROJECT_NAME logs -f tunnel"
else
    echo ""
    echo "🎉  SUCCESS! Your app is live at:"
    echo ""
    echo "    $URL"
    echo ""
    echo "➡️  Share this link with your family!"
    echo "➡️  Press Ctrl+C to stop viewing logs (the app will keep running)."
    echo ""
fi
