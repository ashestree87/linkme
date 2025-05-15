#!/bin/bash

# Color codes for terminal output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║${NC}            ${GREEN}LinkMe Development Starter${NC}           ${BLUE}║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Check if .dev.vars exists
if [ ! -f ".dev.vars" ]; then
  echo -e "${YELLOW}Warning: .dev.vars file not found!${NC}"
  echo -e "Creating from example file..."
  
  if [ -f ".dev.vars.example" ]; then
    cp .dev.vars.example .dev.vars
    echo -e "${GREEN}Created .dev.vars from example.${NC}"
    echo -e "${YELLOW}⚠️  Please edit .dev.vars to add your LinkedIn credentials before continuing.${NC}"
    echo ""
    echo -e "Press Enter to open the file for editing, or Ctrl+C to abort..."
    read
    "${EDITOR:-nano}" .dev.vars
  else
    echo -e "${RED}Error: .dev.vars.example not found. Cannot create configuration.${NC}"
    exit 1
  fi
fi

# Check NODE_ENV
if [ -z "$NODE_ENV" ]; then
  export NODE_ENV=development
  echo -e "${BLUE}Set NODE_ENV to development${NC}"
fi

echo ""
echo -e "${GREEN}Starting LinkMe in remote development mode...${NC}"
echo -e "${YELLOW}Note: You'll need to be logged in to Cloudflare for remote browser bindings to work.${NC}"
echo -e "${YELLOW}This is required for LinkedIn integration functionality.${NC}"
echo ""
echo -e "${BLUE}When the server starts, access the application at:${NC}"
echo -e "${GREEN}http://localhost:8787${NC}"
echo ""
echo -e "${BLUE}Starting server...${NC}"
echo ""

# Start the dev server in remote mode
npm run dev 