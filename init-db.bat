@echo off
echo 🚀 Initializing database for Multiplayer Card Game...

REM Check if .env.local exists
if not exist .env.local (
    echo ❌ .env.local file not found!
    echo Please create .env.local with your DATABASE_URL
    echo Example:
    echo DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"
    echo DIRECT_URL="postgresql://user:pass@host/db?sslmode=require"
    pause
    exit /b 1
)

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

REM Push database schema
echo 📊 Pushing database schema...
npx prisma db push

echo ✅ Database initialization complete!
echo.
echo Next steps:
echo 1. Run 'npm run dev' to start the development server
echo 2. Visit http://localhost:3000 to test the app
echo 3. Visit http://localhost:3000/db-status to verify database connection
pause
