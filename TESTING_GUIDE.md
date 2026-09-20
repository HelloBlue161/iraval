# Iraval App - Testing Guide

This guide walks you through testing the Iraval app to ensure production quality.

---

## Part 1: Web App Testing (PWA)

### 1.1 Start the Dev Server

```bash
cd /home/palanivelg/palanivelg/iraval_web_app
npm run dev
```

The app will be available at `http://localhost:5173`

### 1.2 Manual Testing Checklist

#### Authentication
- [ ] **Signup**: Create account with valid data
- [ ] **Signup Validation**: Try invalid email, short password, age < 21
- [ ] **Signup Terms**: Try submitting without accepting terms
- [ ] **Login**: Login with valid credentials
- [ ] **Login Error**: Try wrong password, non-existent username
- [ ] **Password Recovery**: Start the flow (email should be sent)
- [ ] **Logout**: Logout and redirect to login

#### Core Features
- [ ] **Library View**: View your books, filter by language
- [ ] **Add Book**: Add a new book with title, author, language
- [ ] **Edit Book**: Edit an existing book's details
- [ ] **Delete Book**: Delete a book (with confirmation)
- [ ] **Book Status**: Check exchange status badges on books

#### Search & Discovery
- [ ] **Book Search**: Search for a book by title
- [ ] **Filter by Distance**: Set max distance filter
- [ ] **Filter by Zip**: Filter by specific zip code
- [ ] **Filter by Language**: Filter books by language
- [ ] **Find Users**: Click on a book to see users who have it

#### Social Features
- [ ] **Friend Request**: Send a friend request
- [ ] **Accept Friend**: Accept a friend request
- [ ] **Decline Friend**: Decline a friend request
- [ ] **Exchange Request**: Request to borrow a book
- [ ] **Accept Exchange**: Accept a borrow request
- [ ] **Decline Exchange**: Decline a borrow request
- [ ] **Chat**: Send messages to another user

#### UI/UX
- [ ] **Responsive**: Test on mobile, tablet, desktop widths
- [ ] **Navigation**: Test all 7 navigation tabs
- [ ] **Loading States**: Check loading spinners
- [ ] **Error Messages**: Verify helpful error messages
- [ ] **Toast Notifications**: Check success/error/info toasts
- [ ] **Keyboard**: Test keyboard navigation

### 1.3 PWA Testing

#### Install on iOS (Safari)
1. Open `http://localhost:5173` (or your deployed URL)
2. Tap "Share" button → "Add to Home Screen"
3. Tap "Add"
4. Launch from home screen — should open fullscreen like a native app

#### Install on Android (Chrome)
1. Open `http://localhost:5173`
2. Tap the "Install" prompt or go to Chrome menu → "Install App"
3. Launch from home screen

#### Offline Testing
1. Open Chrome DevTools → Application → Service Workers
2. Check "Offline" checkbox
3. Reload the page — should still work for cached content
4. Try navigating to different pages

---

## Part 2: Mobile App Testing (Expo/React Native)

### 2.1 Set Up Testing Environment

#### Install Dependencies
```bash
cd /home/palanivelg/palanivelg/iraval_web_app/apps/mobile
npm install
```

#### Start Expo
```bash
npm start
```

### 2.2 Test on Simulator/Emulator

#### iOS Simulator (Requires Mac)
```bash
npm run ios
```
- Opens iOS simulator automatically
- Test all features with iPhone/iPad simulators
- Test on multiple iOS versions

#### Android Emulator
```bash
npm run android
```
- Opens Android emulator
- Test on different device sizes

### 2.3 Test on Real Device (Recommended)

#### Using Expo Go (No Build Required)
1. Install **Expo Go** app on your iOS/Android device
2. Scan the QR code from the terminal
3. The app loads directly on your device

#### Using Development Build (Better Performance)
```bash
# Install EAS CLI
npm install -g eas-cli

# Build for iOS
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development
```

### 2.4 Mobile Testing Checklist

Same as web app, plus:
- [ ] **Touch Interactions**: All buttons respond to taps
- [ ] **Gesture Navigation**: Swipe back works
- [ ] **Keyboard Handling**: Input fields don't overlap
- [ ] **Orientation**: Works in portrait mode
- [ ] **Safe Area**: Content respects notches/home bars
- [ ] **Performance**: Smooth scrolling, no jank
- [ ] **Memory**: No crashes after extended use

### 2.5 Run Automated Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run specific test file
npx vitest run __tests__/unit/utils.test.ts
```

---

## Part 3: Firebase Test Data Setup

### 3.1 Create Test Users

Use the Firebase Console to create these users:

| Email | Username | Full Name | City | Password |
|-------|----------|-----------|------|----------|
| test_alice@iraval.app | alice_nyc | Alice Chen | New York (10001) | Test#12345 |
| test_bob@iraval.app | bob_la | Bob Martinez | Beverly Hills (90210) | Test#12345 |
| test_carol@iraval.app | carol_chi | Carol Johnson | Chicago (60601) | Test#12345 |
| test_david@iraval.app | david_miami | David Patel | Miami (33101) | Test#12345 |
| test_eve@iraval.app | eve_sf | Eve Nakamura | San Francisco (94101) | Test#12345 |
| test_frank@iraval.app | frank_dallas | Frank Okafor | Dallas (75201) | Test#12345 |

### 3.2 Add Books to Each User's Library

**Alice (New York):**
- The Great Gatsby by F. Scott Fitzgerald [English]
- 1984 by George Orwell [English]
- To Kill a Mockingbird by Harper Lee [English]

**Bob (Beverly Hills):**
- Dune by Frank Herbert [English]
- Clean Code by Robert C. Martin [English]
- The Art of War by Sun Tzu [English]

**Carol (Chicago):**
- Sapiens by Yuval Noah Harari [English]
- Pride and Prejudice by Jane Austen [English]

**David (Miami):**
- Atomic Habits by James Clear [English]
- The Alchemist by Paulo Coelho [Portuguese]
- நீதி நெறி by Thiruvalluvar [Tamil]

**Eve (San Francisco):**
- Meditations by Marcus Aurelius [English]
- The Lean Startup by Eric Ries [English]
- கலவியல் by Bharathiar [Tamil]

**Frank (Dallas):**
- The Hobbit by J.R.R. Tolkien [English]
- Brave New World by Aldous Huxley [English]
- The Art of War by Sun Tzu [English]
- Sapiens by Yuval Noah Harari [English]
- Thinking, Fast and Slow by Daniel Kahneman [English]

### 3.3 Create Test Scenarios

#### Scenario 1: Exchange Flow
1. **David** → searches for "1984" → sees Alice's copy
2. **David** → sends "Request to Borrow" for 1984 → **Pending**
3. **Alice** → sees incoming request → **Accepts**
4. **Alice** & **David** → Chat to coordinate meetup
5. Verify book status changes on both users' libraries

#### Scenario 2: Friends Flow
1. **Alice** → sends friend request to **Bob**
2. **Bob** → sees request → Accepts
3. Both users now see each other as friends
4. Verify friend count updates

#### Scenario 3: Cross-City Search
1. **Frank** (Dallas) → searches for "Sapiens"
2. Should find Carol's copy (Chicago) and Frank's own copy
3. Distance filter should show Chicago as ~800 miles

#### Scenario 4: Multi-Language
1. **David** (Miami) → searches for Tamil books
2. Should find his own Tamil books and Eve's Tamil book
3. Language filter should work correctly

---

## Part 4: Production Quality Test Scenarios

### 4.1 Edge Cases to Test

| Scenario | Expected Behavior |
|----------|------------------|
| User with no books | Shows empty state with helpful message |
| No search results | Shows "No results found" with suggestion |
| User with no friends | Shows empty state |
| User with no exchanges | Shows empty state |
| Offline (web) | PWA shows cached content |
| Slow network | Loading states show appropriately |
| Same book by multiple users | Shows all copies |
| Book in exchange | Status badge shows correctly |
| Declined exchange | Shows decline note if provided |
| Chat with no messages | Shows empty state |
| Very long username | Truncates gracefully |

### 4.2 Performance Benchmarks

| Metric | Target |
|--------|--------|
| Initial load time | < 3 seconds |
| Screen transition | < 200ms |
| Search results | < 1 second |
| Message send | < 500ms |
| Book list render | < 500ms |

### 4.3 Accessibility Checklist

| Check | Status |
|-------|--------|
| All images have alt text | [ ] |
| Color contrast meets WCAG AA | [ ] |
| Keyboard navigation works | [ ] |
| Focus indicators visible | [ ] |
| Screen reader labels present | [ ] |

---

## Part 5: Quick Test Command Reference

```bash
# Web app
npm run dev                    # Start dev server
npm run build                  # Build for production
npm run preview               # Preview production build
npm test                      # Run tests
npm run test:watch            # Watch mode

# Mobile app
cd apps/mobile
npm start                     # Start Expo
npm run ios                   # iOS simulator
npm run android               # Android emulator

# Firebase
node scripts/seed-test-data.js  # View test data structure
```

---

## Summary: Production-Quality Testing Workflow

1. **Set up test data** in Firebase (6 users, 19 books)
2. **Test web app** (PWA) on desktop browser
3. **Test PWA install** on iOS and Android devices
4. **Test mobile app** on Expo Go or simulator
5. **Run automated tests**: `npm test`
6. **Verify all 9 features** from the test report
7. **Edge case testing** (see section 4.1)
8. **Performance check** (see section 4.2)
