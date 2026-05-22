#!/bin/bash

# JARVIS AI Assistant Launcher
# Works on Linux and macOS

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}"
echo "╔══════════════════════════════════════════╗"
echo "║         JARVIS AI Assistant              ║"
echo "║      Starting up... Please wait          ║"
echo "╚══════════════════════════════════════════╝"
echo -e "${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] Node.js not found!${NC}"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

echo -e "${GREEN}[OK] Node.js: $(node --version)${NC}"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[INFO] Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR] Failed to install dependencies!${NC}"
        exit 1
    fi
fi

# Check TTS for Linux
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    if ! command -v espeak &> /dev/null; then
        echo -e "${YELLOW}[INFO] espeak not found. Installing...${NC}"
        sudo apt-get install -y espeak 2>/dev/null || echo "Please install espeak manually"
    fi
fi

echo ""
echo -e "${BLUE}[INFO] Launching JARVIS...${NC}"
echo ""

# Open dashboard in browser
if [[ "$OSTYPE" == "darwin"* ]]; then
    open "dashboard/index.html"
elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
    xdg-open "dashboard/index.html" 2>/dev/null &
fi

# Launch JARVIS
node src/index.js

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${RED}[ERROR] JARVIS exited with error. Check logs above.${NC}"
fi
