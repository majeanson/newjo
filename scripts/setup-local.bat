@echo off
echo 🚀 Setting up Multiplayer Card Game locally...

REM Clean any existing node_modules and lock files
echo 🧹 Cleaning existing dependencies...
if exist node_modules rmdir /s /q node_modules
if exist package-lock.json del package-lock.json
if exist yarn.lock del yarn.lock

REM Install dependencies with legacy peer deps to resolve conflicts
echo 📦 Installing dependencies...
npm install --legacy-peer-deps

REM Generate Prisma client
echo 🔧 Generating Prisma client...
npx prisma generate

echo ✅ Setup complete!
echo.
echo Next steps:
echo 1. Set up your .env.local file with DATABASE_URL
echo 2. Run 'npm run db:push' to create database tables
echo 3. Run 'npm run dev' to start the development server
pause
