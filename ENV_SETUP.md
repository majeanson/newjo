# Environment Variables Setup

## What you need:

1. **DATABASE_URL** - Your Neon connection string
2. **DIRECT_URL** - Same as DATABASE_URL (for Neon)

## Steps:

### 1. Get your Neon connection string
- Go to your Neon dashboard
- Click on your project
- Go to "Connection Details"
- Copy the connection string (it looks like this):
\`\`\`
postgresql://username:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
\`\`\`

### 2. Create .env.local file
Create a file called `.env.local` in your project root (same folder as package.json):

\`\`\`env
# Neon Database Connection
DATABASE_URL="postgresql://neondb_owner:npg_EfQiT3XvBc5u@ep-snowy-union-adj6xz7q-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
DIRECT_URL="postgresql://neondb_owner:npg_EfQiT3XvBc5u@ep-snowy-union-adj6xz7q-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
\`\`\`

**Important**: Replace the example connection string with your actual Neon connection string!

### 3. Restart your development server
After adding the environment variables, restart your Next.js development server:
\`\`\`bash
# Stop the server (Ctrl+C) then restart
npm run dev
\`\`\`

## Why DIRECT_URL?

- Prisma uses `DATABASE_URL` for connection pooling
- `DIRECT_URL` is used for migrations and direct database operations
- For Neon, both should be the same connection string
\`\`\`

Now let's update the database status page to show exactly what you need to do:
