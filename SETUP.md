# Database Setup Guide

## Step 1: Create Neon Database

1. Go to [https://neon.tech](https://neon.tech)
2. Sign up for a free account
3. Create a new project
4. Copy your connection string from the dashboard

## Step 2: Set Environment Variables

Create a `.env.local` file in your project root:

\`\`\`env
# Neon Database URLs
DATABASE_URL="postgresql://username:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
DIRECT_URL="postgresql://username:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require"
\`\`\`

Replace the connection string with your actual Neon connection string.

## Step 3: Install Dependencies

\`\`\`bash
npm install prisma @prisma/client
npm install -D prisma
\`\`\`

## Step 4: Generate Prisma Client

\`\`\`bash
npx prisma generate
\`\`\`

## Step 5: Push Database Schema

\`\`\`bash
npx prisma db push
\`\`\`

## Step 6: Verify Setup

Run the setup script to test your connection:

\`\`\`bash
npx tsx scripts/setup-database.ts
\`\`\`

## Troubleshooting

### Connection Issues
- Verify your DATABASE_URL is correct
- Make sure your Neon database is active
- Check that you're using the correct region

### Schema Issues
- Run `npx prisma db push` to sync your schema
- Use `npx prisma studio` to view your database

### Environment Variables
- Make sure `.env.local` is in your project root
- Restart your development server after adding environment variables
\`\`\`

Now let's update the Prisma client to handle connection issues better:

```typescriptreact file="lib/prisma.ts"
[v0-no-op-code-block-prefix]import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: ['query', 'error', 'warn'],
})

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma

// Test connection function
export async function testConnection() {
  try {
    await prisma.$connect()
    console.log('✅ Database connected successfully')
    return true
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    return false
  }
}
