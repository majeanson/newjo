-- Test basic database operations
-- Insert test data to verify everything works

-- Create test user
INSERT INTO users (name) VALUES ('Test User') 
ON CONFLICT DO NOTHING;

-- Get the test user ID
WITH test_user AS (
    SELECT id FROM users WHERE name = 'Test User' LIMIT 1
),
-- Create test room
test_room AS (
    INSERT INTO rooms (name, host_id, current_deck) 
    SELECT 'Test Room', id, ARRAY['A♠', 'K♥', 'Q♦', 'J♣']
    FROM test_user
    RETURNING id, host_id
),
-- Add user to room
room_membership AS (
    INSERT INTO room_members (room_id, user_id)
    SELECT tr.id, tr.host_id
    FROM test_room tr
    RETURNING room_id, user_id
),
-- Play a test card
test_card AS (
    INSERT INTO played_cards (room_id, user_id, card)
    SELECT rm.room_id, rm.user_id, 'A♠'
    FROM room_membership rm
    RETURNING id
)
-- Show test results
SELECT 
    'Test operations completed successfully!' as status,
    (SELECT COUNT(*) FROM users WHERE name = 'Test User') as test_users,
    (SELECT COUNT(*) FROM rooms WHERE name = 'Test Room') as test_rooms,
    (SELECT COUNT(*) FROM room_members rm 
     JOIN rooms r ON rm.room_id = r.id 
     WHERE r.name = 'Test Room') as test_memberships,
    (SELECT COUNT(*) FROM played_cards pc 
     JOIN rooms r ON pc.room_id = r.id 
     WHERE r.name = 'Test Room') as test_cards;
