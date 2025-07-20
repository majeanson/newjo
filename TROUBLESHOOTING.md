# Troubleshooting Guide

## Dependency Conflicts

### Issue: ERESOLVE unable to resolve dependency tree
This happens when there are conflicting versions of dependencies.

**Solution 1: Use legacy peer deps**
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

**Solution 2: Use force flag**
\`\`\`bash
npm install --force
\`\`\`

**Solution 3: Clean install**
\`\`\`bash
# Delete node_modules and lock files
rm -rf node_modules package-lock.json

# Reinstall with legacy peer deps
npm install --legacy-peer-deps
\`\`\`

### Issue: date-fns version conflict
The error occurs because react-day-picker expects an older version of date-fns.

**Solution: Use the provided package.json**
The package.json in this project includes version overrides to resolve this conflict.

## Database Issues

### Issue: Prisma client not found
**Solution:**
\`\`\`bash
npx prisma generate
\`\`\`

### Issue: Database connection failed
**Solution:**
1. Check your .env.local file has DATABASE_URL
2. Verify your Neon database is active
3. Test connection at /db-status page

## Development Server Issues

### Issue: Port already in use
**Solution:**
\`\`\`bash
# Kill process on port 3000
npx kill-port 3000

# Or use a different port
npm run dev -- -p 3001
\`\`\`

### Issue: TypeScript errors
**Solution:**
\`\`\`bash
# Clear Next.js cache
rm -rf .next

# Restart development server
npm run dev
\`\`\`

## Quick Setup Commands

### For Windows:
\`\`\`cmd
# Run the setup script
scripts\\setup-local.bat
\`\`\`

### For Mac/Linux:
\`\`\`bash
# Make script executable and run
chmod +x scripts/setup-local.sh
./scripts/setup-local.sh
\`\`\`

### Manual Setup:
\`\`\`bash
# Clean install
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Set up environment
cp .env.example .env.local
# Edit .env.local with your DATABASE_URL

# Push database schema
npm run db:push

# Start development server
npm run dev
\`\`\`

## Environment Variables

Create a \`.env.local\` file:
\`\`\`env
DATABASE_URL="your_neon_connection_string"
DIRECT_URL="your_neon_connection_string"
\`\`\`

## Common Commands

\`\`\`bash
# Development
npm run dev

# Database
npm run db:push      # Push schema to database
npm run db:studio    # Open Prisma Studio
npm run db:generate  # Generate Prisma client

# Build
npm run build
npm run start
\`\`\`
\`\`\`

Let's also create an environment example file:
