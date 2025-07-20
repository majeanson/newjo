-- This script will help you set up your Neon database
-- 
-- STEP 1: Go to https://neon.tech and create a free account
-- STEP 2: Create a new project 
-- STEP 3: Copy your connection string from the Neon dashboard
-- STEP 4: Add it to your environment variables
--
-- Your connection string should look like:
-- postgresql://username:password@ep-example-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
--
-- Add this to your .env.local file:
-- DATABASE_URL="your_connection_string_here"

-- Test connection query
SELECT 'Database connection successful!' as status, version() as postgres_version;
