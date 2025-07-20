-- Test database connection and show basic info
SELECT 
    'Database connection successful!' as status,
    current_database() as database_name,
    current_user as user_name,
    version() as postgres_version,
    now() as current_time;
