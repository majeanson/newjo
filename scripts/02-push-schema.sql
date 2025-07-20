-- This will be handled by Prisma db push command
-- Prisma will create the tables based on our schema.prisma file

-- Expected tables to be created:
-- 1. users
-- 2. rooms  
-- 3. room_members
-- 4. played_cards

-- Verify tables exist after push
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
ORDER BY table_name;
