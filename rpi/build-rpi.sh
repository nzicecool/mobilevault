#!/bin/bash
# MobileVault - RPi Build Script
# Builds the frontend and prepares the RPi deployment package

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DEPLOY_DIR="$SCRIPT_DIR/deploy"

echo "🔒 MobileVault - Building for Raspberry Pi..."
echo ""

# Check Node.js version
NODE_VERSION=$(node --version 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo "❌ Node.js 18+ is required. Current: $(node --version 2>/dev/null || echo 'not found')"
  exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
cd "$PROJECT_DIR"
pnpm install

# Build frontend
echo "🏗️  Building frontend..."
pnpm build

# Create deploy directory
echo "📁 Creating deployment package..."
mkdir -p "$DEPLOY_DIR"

# Copy files
cp -r "$PROJECT_DIR/dist" "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/server.mjs" "$DEPLOY_DIR/"
cp "$SCRIPT_DIR/schema.sql" "$DEPLOY_DIR/"

# Create minimal package.json for deployment
cat > "$DEPLOY_DIR/package.json" << 'EOF'
{
  "name": "mobilevault-rpi",
  "version": "1.0.0",
  "type": "module",
  "description": "MobileVault - Secure encrypted personal information storage",
  "scripts": {
    "start": "node server.mjs"
  },
  "dependencies": {
    "better-sqlite3": "^12.9.0",
    "express": "^4.21.2"
  }
}
EOF

# Create data directory
mkdir -p "$DEPLOY_DIR/data"

echo ""
echo "✅ Build complete! Deployment package created at: $DEPLOY_DIR"
echo ""
echo "To run on your Raspberry Pi:"
echo "  1. Copy the 'deploy' folder to your RPi"
echo "  2. Run: cd deploy && npm install"
echo "  3. Run: node server.mjs"
echo ""
