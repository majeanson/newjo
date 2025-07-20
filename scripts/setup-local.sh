#!/bin/bash

echo "🚀 Setting up Multiplayer Card Game locally..."

# Clean any existing node_modules and lock files
echo "🧹 Cleaning existing dependencies..."
rm -rf node_modules
rm -f package-lock.json
rm -f yarn.lock

# Install dependencies with legacy peer deps to resolve conflicts
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up your .env.local file with DATABASE_URL"
echo "2. Run 'npm run db:push' to create database tables"
echo "3. Run 'npm run dev' to start the development server"
