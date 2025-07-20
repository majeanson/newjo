#!/bin/bash

echo "🚀 Initializing database for Multiplayer Card Game..."

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found!"
    echo "Please create .env.local with your DATABASE_URL"
    echo "Example:"
    echo 'DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"'
    echo 'DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"'
    exit 1
fi

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Push database schema
echo "📊 Pushing database schema..."
npx prisma db push

# Check if successful
if [ $? -eq 0 ]; then
    echo "✅ Database initialization complete!"
    echo ""
    echo "Next steps:"
    echo "1. Run 'npm run dev' to start the development server"
    echo "2. Visit http://localhost:3000 to test the app"
    echo "3. Visit http://localhost:3000/db-status to verify database connection"
else
    echo "❌ Database initialization failed!"
    echo "Please check your DATABASE_URL and try again"
fi
