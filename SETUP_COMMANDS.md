# Quick Setup Commands

Since the package.json scripts might not be available yet, here are the direct commands:

## 1. Install Dependencies
\`\`\`bash
npm install --legacy-peer-deps
\`\`\`

## 2. Set Up Environment Variables
Create a \`.env.local\` file in your project root:
\`\`\`env
DATABASE_URL="your_neon_connection_string_here"
DIRECT_URL="your_neon_connection_string_here"
\`\`\`

## 3. Generate Prisma Client
\`\`\`bash
npx prisma generate
\`\`\`

## 4. Push Database Schema (instead of npm run db:push)
\`\`\`bash
npx prisma db push
\`\`\`

## 5. Start Development Server
\`\`\`bash
npm run dev
\`\`\`

## Alternative Database Commands

If npm scripts don't work, use these direct commands:

### Push schema to database:
\`\`\`bash
npx prisma db push
\`\`\`

### Open Prisma Studio:
\`\`\`bash
npx prisma studio
\`\`\`

### Generate Prisma client:
\`\`\`bash
npx prisma generate
\`\`\`

### Reset database:
\`\`\`bash
npx prisma migrate reset
\`\`\`

## Troubleshooting

### If Prisma commands don't work:
1. Make sure Prisma is installed: \`npm install prisma @prisma/client\`
2. Check if prisma/schema.prisma exists
3. Verify your DATABASE_URL in .env.local

### If you get "command not found":
\`\`\`bash
# Install Prisma globally
npm install -g prisma

# Or use npx (recommended)
npx prisma --help
\`\`\`
\`\`\`

Let's also create a simple database initialization script that doesn't rely on npm scripts:
