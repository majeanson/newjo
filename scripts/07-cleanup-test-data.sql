-- Clean up test data
DELETE FROM played_cards 
WHERE room_id IN (SELECT id FROM rooms WHERE name = 'Test Room');

DELETE FROM room_members 
WHERE room_id IN (SELECT id FROM rooms WHERE name = 'Test Room');

DELETE FROM rooms WHERE name = 'Test Room';

DELETE FROM users WHERE name = 'Test User';

-- Verify cleanup
SELECT 
    'Cleanup completed!' as status,
    (SELECT COUNT(*) FROM users WHERE name = 'Test User') as remaining_test_users,
    (SELECT COUNT(*) FROM rooms WHERE name = 'Test Room') as remaining_test_rooms;
