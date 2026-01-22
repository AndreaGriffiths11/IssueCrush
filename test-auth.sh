#!/bin/bash

echo "=== IssueCrush Authentication Test ==="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${RED}✗ .env file not found${NC}"
    echo "  Create it from .env.example and add your credentials"
    exit 1
fi

# Source .env
source .env

# Test 1: Check environment variables
echo "1. Checking environment variables..."
if [ -z "$EXPO_PUBLIC_GITHUB_CLIENT_ID" ] || [ "$EXPO_PUBLIC_GITHUB_CLIENT_ID" = "your_github_oauth_app_client_id" ]; then
    echo -e "${RED}✗ EXPO_PUBLIC_GITHUB_CLIENT_ID not set or using placeholder${NC}"
    ENV_OK=false
else
    echo -e "${GREEN}✓ EXPO_PUBLIC_GITHUB_CLIENT_ID is set${NC}"
    ENV_OK=true
fi

if [ -z "$GITHUB_CLIENT_SECRET" ] || [ "$GITHUB_CLIENT_SECRET" = "your_github_oauth_app_client_secret" ]; then
    echo -e "${RED}✗ GITHUB_CLIENT_SECRET not set or using placeholder${NC}"
    ENV_OK=false
else
    echo -e "${GREEN}✓ GITHUB_CLIENT_SECRET is set${NC}"
fi

echo ""

# Test 2: Check if server is running
echo "2. Checking if server is running..."
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Server is running on port 3000${NC}"
    SERVER_OK=true
else
    echo -e "${RED}✗ Server is not running${NC}"
    echo -e "${YELLOW}  Run: npm run server${NC}"
    SERVER_OK=false
fi

echo ""

# Test 3: Check server health endpoint
if [ "$SERVER_OK" = true ]; then
    echo "3. Testing server health endpoint..."
    HEALTH_RESPONSE=$(curl -s http://localhost:3000/health)
    if [ "$HEALTH_RESPONSE" = '{"status":"ok"}' ]; then
        echo -e "${GREEN}✓ Health endpoint working${NC}"
    else
        echo -e "${YELLOW}! Health endpoint returned: $HEALTH_RESPONSE${NC}"
    fi
else
    echo "3. Skipping server tests (server not running)"
fi

echo ""

# Summary
echo "=== Summary ==="
if [ "$ENV_OK" = true ] && [ "$SERVER_OK" = true ]; then
    echo -e "${GREEN}✓ Ready to test authentication!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Run: npm start"
    echo "2. Open: http://localhost:8081"
    echo "3. Click 'Start GitHub login'"
    echo "4. Watch the browser console for debug logs"
elif [ "$SERVER_OK" = false ]; then
    echo -e "${YELLOW}Start the server first:${NC}"
    echo "  npm run server"
    echo ""
    echo "Or start both server and app together:"
    echo "  npm run dev"
else
    echo -e "${RED}Fix the issues above before testing${NC}"
fi
