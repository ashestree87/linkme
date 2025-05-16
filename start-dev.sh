#!/bin/bash

# Set color variables
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print header
echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║            LinkMe Development Starter           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Set NODE_ENV to development
export NODE_ENV=development
echo -e "Set NODE_ENV to development\n"

# First make sure browser binding is available by checking login
echo -e "Checking Cloudflare authentication status..."
npx wrangler whoami >/dev/null 2>&1
if [ $? -ne 0 ]; then
  echo -e "${RED}Error: You're not logged into Cloudflare. Please login first with:${NC}"
  echo -e "${YELLOW}npx wrangler login${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Cloudflare login verified${NC}\n"

# Start the development server
echo -e "Starting LinkMe in remote development mode..."
echo -e "Note: You'll need to be logged in to Cloudflare for remote browser bindings to work."
echo -e "This is required for LinkedIn integration functionality.\n"

echo -e "When the server starts, access the application at:"
echo -e "${GREEN}http://localhost:8787${NC}\n"

echo -e "To test your LinkedIn auth status, visit:"
echo -e "${GREEN}http://localhost:8787/linkedin-test${NC}\n"

echo -e "Starting server..."
echo ""

# Start the development server in remote mode
npx wrangler dev src/index.ts --remote 