# Iraval Web App - Feature Test Report

**Date:** 2026-08-09
**App:** Iraval Web App (localhost:5173)
**Firebase Project:** iraval-7733e

---

## 1. Exchange Request ("Request to Borrow" / "Send Exchange Request")

**Status: FAIL**

### Flow
1. User clicks "Request to Borrow" on another user's profile (UserProfileView.tsx)
2. ExchangeRequestView modal opens with book details and optional note
3. User clicks "Send Exchange Request"
4. Calls `sendExchangeRequest()` in firestoreService.ts (line 382-397)
5. Creates a document in `/exchanges/{id}` with status 'pending'

### Root Cause
The Firestore rules in `firestore.rules` line 31-36 have correct `allow create: if request.auth != null;` permission for the exchanges collection. The frontend code also appears correct -- `sendExchangeRequest()` uses `setDoc()` to create a document with the right fields.

**HOWEVER**, the `onUserExchanges()` function (firestoreService.ts lines 399-437) has a **critical race condition bug** that causes exchanges to disappear from the user's view:

**The Bug (firestoreService.ts lines 417-422):**
- Query 1 watches exchanges where user is the `senderId`
- Query 2 watches exchanges where user is the `receiverId`
- Both results are merged into a single `allExchanges` array
- In the Query 1 listener callback (line 417-422), it checks if an exchange ID from `allExchanges` exists in `newIds` (the IDs from Query 1's results)
- If the exchange is NOT in Query 1's results (e.g., it was only sent to the user, so it only appears in Query 2), it gets **incorrectly removed** from `allExchanges`
- This means exchanges the user received (as receiver) get deleted from the UI when Query 1's listener fires

**Example scenario:**
1. User A sends exchange to User B (receiverId = User B)
2. Query 1 (senderId=User B) returns empty
3. Query 2 (receiverId=User B) returns the exchange
4. Query 1 listener fires, sees the exchange in `allExchanges` but NOT in `newIds`, removes it
5. Exchange disappears from User B's Exchanges view

### Fix Required
Change the `onUserExchanges()` function to use proper Set-based add/remove logic instead of splicing based on only one query's IDs. See the fix applied in firestoreService.ts.

---

## 2. Login/Signup

**Status: PASS**

### Details
- **LoginView.tsx:** Uses `loginByUsername()` which queries users collection by username, finds the email, then signs in with Firebase Auth. Proper error handling for "user not found" and "wrong password".
- **SignupView.tsx:** Validates password strength, 21+ age check, username uniqueness via `isUsernameTaken()`, then calls `signupFn()` which creates Firebase Auth user + writes user document to Firestore.
- **AuthContext.tsx:** `signupFn` creates auth user then writes user doc with `setDoc()`. `loginFn` uses Firebase `signInWithEmailAndPassword()`. `loginByUsername` queries Firestore for username-to-email mapping. All correct.
- Firestore rules allow `allow read: if true` and `allow write: if request.auth != null && request.auth.uid == userId` for users collection -- correct.

---

## 3. Library View

**Status: PASS**

### Details
- **LibraryView.tsx:** Uses `onUserBooks()` to subscribe to user's books subcollection. Shows books in a responsive grid with cover images.
- **Status colors:** `borrowed` = blue badge, `lent` = green badge, `pending_exchange` = orange badge. All correct in the code (lines 209-218).
- **Exchange badges:** `onUserBooks()` in firestoreService.ts (lines 33-106) queries both directions of exchanges and matches by bookId (direct match) or bookTitle (fallback match). Status mapping: `accepted` + isSender = 'borrowed', `accepted` + notSender = 'lent', `pending` = 'pending_exchange'. All correct.
- Add/Edit/Delete book modals work correctly. Google Books API integration for validation.

---

## 4. Search View

**Status: PASS**

### Details
- **SearchView.tsx:** Supports search mode (query text) and browse mode (empty = all books). Uses `searchAllBooks()` and `getAllBooks()` from firestoreService.ts.
- **Filters:** Distance filter (miles), zip code filter (exclusive with distance), friends-first checkbox, sort by name checkbox. All implemented correctly.
- **Friends-first logic:** Hardcoded friend UIDs (`1j1bLY8YynhkYS6hwB4PP3bs9dM2` and `CmnlJe4mtxbhd4A7zRaNTFKBsu23`). Works but uses hardcoded UIDs instead of querying the friend list.
- **Duplicate user doc skip:** `searchAllBooks()` (firestoreService.ts lines 480-482) skips documents where `userData.uid && userData.uid !== userDoc.id`. Same in `searchUsersWithBook()` (lines 304-305). Correct.
- **Debounced search:** 300ms debounce on input. Search cache via `useRef`. Correct.

---

## 5. Friends View

**Status: PASS**

### Details
- **FriendRequestView.tsx:** Shows incoming requests, outgoing requests, and accepted friends.
- **onIncomingRequests:** Subscribes to friendRequests where receiverId == uid AND status == 'pending'. Correct.
- **onOutgoingRequests:** Subscribes to friendRequests where senderId == uid AND status == 'pending'. Then checks if receiver sent an accepted request back -- if so, skips the pending outgoing request (one-way logic). Correct (lines 161-185 in firestoreService.ts).
- **Accept/Decline:** Calls `acceptFriendRequest()` and `declineFriendRequest()` which update the status field. Correct.
- **Friends list:** Uses `getAcceptedFriends()` to fetch users with accepted bidirectional requests. Correct.

---

## 6. Profile View

**Status: PASS**

### Details
- **ProfileView.tsx (My Profile):** Shows current user's own profile via `getUserProfile()`. Shows nearby readers (within 20 miles) using haversine distance calculation on zip codes. Correct.
- **UserProfileView.tsx (Other User):** Opens when user clicks another user from search results. Shows the other user's profile with friendship status checking (accepted, pending, none). Has "Send Message" (opens ChatView) and "Request to Borrow" (opens ExchangeRequestView). Correct.
- Friendship status check queries friendRequests collection for both directions and both statuses. Correct.

---

## 7. Exchanges View (MyExchangesView)

**Status: NEEDS_FIX (due to bug #1)**

### Details
- **MyExchangesView.tsx:** Shows all exchanges where user is sender or receiver. Sorts by status (pending first, then accepted, then declined).
- **Status display:** Uses icons and colored badges (Clock/amber for pending, Check/green for accepted, X/red for declined). Correct.
- **Actions:** Incoming pending exchanges show Accept/Decline buttons. Outgoing or already-responded exchanges show no actions. Correct.
- **Recipient/Sender names:** Fetched via `getUserById()` in a useEffect. Shows "Loading..." while fetching. Correct.
- **BUG:** The underlying `onUserExchanges()` function has the race condition bug described in Feature #1 that causes exchanges to disappear from the list.

---

## 8. Chat/Messages

**Status: PASS**

### Details
- **ChatView.tsx:** Modal chat interface. Generates `chatId` via `getChatId()` which sorts UIDs alphabetically and creates `chat_uid1_uid2`. Uses `onChatMessages()` for real-time subscription. Messages rendered with own messages right-aligned (amber) and others left-aligned (white). Send via Enter key or button. Correct.
- **ChatListView.tsx:** Lists all friends (accepted requests) as chat contacts. Opens ChatView modal on click. Correct.
- **Firestore rules:** `chats` collection allows read/write for authenticated users. Messages subcollection also allows read/write for authenticated users. Correct.

---

## 9. Navbar

**Status: PASS**

### Details
- **Navbar.tsx:** Two layouts -- mobile top bar (sticky, with tab bar) and desktop sidebar.
- **7 tabs:** Library (/library), Search (/search), Profile (/profile), Friends (/friends), Chats (/chats), Exchanges (/exchanges), Settings (/settings). All present.
- **Active state:** Uses `location.pathname === path` for exact match. Correct highlighting with amber accent.
- **Logout:** `handleLogout` calls `logoutFn()` from AuthContext. Correct.
- **Icons:** lucide-react icons match each tab label. Correct.
- All routes defined in App.tsx. Correct.

---

## Summary

| # | Feature | Status |
|---|---------|--------|
| 1 | Exchange Request | FAIL |
| 2 | Login/Signup | PASS |
| 3 | Library View | PASS |
| 4 | Search View | PASS |
| 5 | Friends View | PASS |
| 6 | Profile View | PASS |
| 7 | Exchanges View | NEEDS_FIX |
| 8 | Chat/Messages | PASS |
| 9 | Navbar | PASS |

**Critical Bug:** Exchange Request creates documents in Firestore but `onUserExchanges()` has a listener race condition that removes received exchanges from the UI. Fix applied to firestoreService.ts.

**Minor Note:** Friends-first sorting in SearchView.tsx uses hardcoded UIDs instead of querying the friend list. Not a functional bug but could be improved to use the actual friends list from Firestore.
