# Multiplayer Testing Guide

## How to Test Multiplayer Features

### Method 1: Using the Multiplayer Tester (Recommended)

1. **Visit the Multiplayer Test Page**
   - Go to `/multiplayer-test` or click the "Multiplayer Test" button
   - This page allows you to create multiple test users

2. **Create Test Users**
   - Create 2-3 different users (e.g., "Alice", "Bob", "Charlie")
   - Each user gets a unique session ID

3. **Open Multiple Tabs**
   - Open 2-3 browser tabs/windows
   - In each tab, go to `/multiplayer-test`
   - Switch to a different user in each tab

4. **Test the Game**
   - Go to the main app (`/`) in each tab
   - Each tab will be signed in as a different user
   - Create rooms and join them from different tabs
   - Test real-time features

### Method 2: Using Different Browsers

1. **Use Different Browsers**
   - Chrome, Firefox, Safari, Edge, etc.
   - Each browser has separate cookies

2. **Sign In Differently**
   - Sign in with different names in each browser
   - Test multiplayer features across browsers

### Method 3: Using Incognito/Private Windows

1. **Open Multiple Incognito Windows**
   - Each incognito window has separate session storage
   - Sign in with different names in each window

### What to Test

#### Room Management
- [ ] Create rooms from different users
- [ ] Join rooms created by other users
- [ ] See updated member counts

#### Card Game Features
- [ ] Host draws cards - other players see updates
- [ ] Players play cards - everyone sees the plays
- [ ] Real-time event notifications work

#### Real-time Updates
- [ ] Open multiple tabs in the same room
- [ ] Draw a card in one tab
- [ ] Verify other tabs show the drawn card
- [ ] Play cards and see them appear in other tabs

### Troubleshooting

**Issue: All tabs show the same user**
- Solution: Use the Multiplayer Tester to create separate sessions

**Issue: Real-time events not working**
- Check browser console for errors
- Verify Server-Sent Events are connecting

**Issue: Users not seeing each other's actions**
- Refresh the pages
- Check if you're in the same room

### Tips for Better Testing

1. **Use Descriptive Names**: "Host", "Player1", "Player2"
2. **Test Edge Cases**: Empty rooms, full rooms, host leaving
3. **Check Mobile**: Test on mobile devices too
4. **Network Simulation**: Use browser dev tools to simulate slow networks
