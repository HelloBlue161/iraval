/**
 * Iraval Test Data Seeder - Uses Firebase REST API
 * 
 * This script creates test users and data for the Iraval app.
 * Run: node scripts/seed-test-data-REST.js
 * 
 * IMPORTANT: This requires Firebase Authentication to be enabled
 * with email/password provider.
 * 
 * Test users created:
 * - alice_nyc (New York) - 3 books
 * - bob_la (Beverly Hills) - 3 books
 * - carol_chi (Chicago) - 2 books
 * - david_miami (Miami) - 3 books
 * - eve_sf (San Francisco) - 3 books
 * - frank_dallas (Dallas) - 5 books
 * 
 * All passwords: Test#12345!
 */

const API_KEY = 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA';
const PROJECT_ID = 'iraval-7733e';
const BASE_URL = `https://identitytoolkit.googleapis.com/v1`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const PASSWORD = 'Test#12345!';

// Test users configuration
const USERS = [
  {
    email: 'alice_test@iraval.app',
    displayName: 'Alice Chen',
    username: 'alice_nyc',
    birthDate: '1990-05-15',
    zipCode: '10001',
    city: 'New York',
  },
  {
    email: 'bob_test@iraval.app',
    displayName: 'Bob Martinez',
    username: 'bob_la',
    birthDate: '1988-11-22',
    zipCode: '90210',
    city: 'Beverly Hills',
  },
  {
    email: 'carol_test@iraval.app',
    displayName: 'Carol Johnson',
    username: 'carol_chi',
    birthDate: '1992-03-08',
    zipCode: '60601',
    city: 'Chicago',
  },
  {
    email: 'david_test@iraval.app',
    displayName: 'David Patel',
    username: 'david_miami',
    birthDate: '1995-07-30',
    zipCode: '33101',
    city: 'Miami',
  },
  {
    email: 'eve_test@iraval.app',
    displayName: 'Eve Nakamura',
    username: 'eve_sf',
    birthDate: '1993-01-12',
    zipCode: '94101',
    city: 'San Francisco',
  },
  {
    email: 'frank_test@iraval.app',
    displayName: 'Frank Okafor',
    username: 'frank_dallas',
    birthDate: '1987-09-25',
    zipCode: '75201',
    city: 'Dallas',
  },
];

// Books for each user
const USER_BOOKS = {
  'alice_nyc': [
    { bookId: 'book_alice_1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', language: 'English' },
    { bookId: 'book_alice_2', title: '1984', author: 'George Orwell', language: 'English' },
    { bookId: 'book_alice_3', title: 'To Kill a Mockingbird', author: 'Harper Lee', language: 'English' },
  ],
  'bob_la': [
    { bookId: 'book_bob_1', title: 'Dune', author: 'Frank Herbert', language: 'English' },
    { bookId: 'book_bob_2', title: 'Clean Code', author: 'Robert C. Martin', language: 'English' },
    { bookId: 'book_bob_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
  ],
  'carol_chi': [
    { bookId: 'book_carol_1', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
    { bookId: 'book_carol_2', title: 'Pride and Prejudice', author: 'Jane Austen', language: 'English' },
  ],
  'david_miami': [
    { bookId: 'book_david_1', title: 'Atomic Habits', author: 'James Clear', language: 'English' },
    { bookId: 'book_david_2', title: 'The Alchemist', author: 'Paulo Coelho', language: 'Portuguese' },
    { bookId: 'book_david_3', title: 'நீதி நெறி', author: 'Thiruvalluvar', language: 'Tamil' },
  ],
  'eve_sf': [
    { bookId: 'book_eve_1', title: 'Meditations', author: 'Marcus Aurelius', language: 'English' },
    { bookId: 'book_eve_2', title: 'The Lean Startup', author: 'Eric Ries', language: 'English' },
    { bookId: 'book_eve_3', title: 'கலவியல்', author: 'Bharathiar', language: 'Tamil' },
  ],
  'frank_dallas': [
    { bookId: 'book_frank_1', title: 'The Hobbit', author: 'J.R.R. Tolkien', language: 'English' },
    { bookId: 'book_frank_2', title: 'Brave New World', author: 'Aldous Huxley', language: 'English' },
    { bookId: 'book_frank_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
    { bookId: 'book_frank_4', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
    { bookId: 'book_frank_5', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', language: 'English' },
  ],
};

// Test scenarios
const TEST_SCENARIOS = {
  friendRequests: [
    { senderId: 'alice_nyc', receiverId: 'bob_la', status: 'pending' },
    { senderId: 'bob_la', receiverId: 'carol_chi', status: 'accepted' },
    { senderId: 'carol_chi', receiverId: 'bob_la', status: 'accepted' },
  ],
  exchanges: [
    {
      bookId: 'book_alice_2',
      bookTitle: '1984',
      bookAuthor: 'George Orwell',
      senderId: 'david_miami',
      receiverId: 'alice_nyc',
      status: 'pending',
      note: 'I would love to read this classic!',
    },
    {
      bookId: 'book_carol_1',
      bookTitle: 'Sapiens',
      bookAuthor: 'Yuval Noah Harari',
      senderId: 'carol_chi',
      receiverId: 'bob_la',
      status: 'accepted',
      note: 'Great book exchange!',
      respondedAt: new Date().toISOString(),
    },
  ],
};

// Fetch ID token for a user (needed for Firestore writes)
async function signInAndGetToken(email, password) {
  const url = `${BASE_URL}/accounts:signInWithPassword?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Auth error: ${data.error.message}`);
  }
  return data.idToken;
}

// Create a user via Firebase Auth REST API
async function createUser(email, password, displayName) {
  const url = `${BASE_URL}/accounts:signUp?key=${API_KEY}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      displayName,
      returnSecureToken: true,
    }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Create user error: ${data.error.message}`);
  }
  return { uid: data.localId, idToken: data.idToken };
}

// Add user profile to Firestore
async function addUserProfile(uid, userData, idToken) {
  const url = `${FIRESTORE_URL}/users/${uid}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        email: { stringValue: userData.email },
        username: { stringValue: userData.username },
        fullName: { stringValue: userData.displayName },
        birthDate: { stringValue: userData.birthDate },
        zipCode: { stringValue: userData.zipCode },
        city: { stringValue: userData.city },
        profileImageURL: { stringValue: '' },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Add user profile error: ${response.statusText}`);
  }
  console.log(`  ✓ User profile created: ${userData.displayName}`);
}

// Add books to user's library
async function addBooks(uid, books, idToken) {
  const batchUrl = `${FIRESTORE_URL}:batchWrite`;
  const writes = books.map(book => ({
    update: {
      name: `${FIRESTORE_URL}/users/${uid}/books/${book.bookId}`,
      fields: {
        title: { stringValue: book.title },
        author: { stringValue: book.author },
        language: { stringValue: book.language },
        addedBy: { stringValue: uid },
        addedAt: { stringValue: new Date().toISOString() },
        bookStatus: { stringValue: 'available' },
      },
      mask: {
        fieldPaths: ['title', 'author', 'language', 'addedBy', 'addedAt', 'bookStatus'],
      },
    },
    updateType: 'UPDATE',
  }));

  const response = await fetch(batchUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({ writes }),
  });

  const data = await response.json();
  const successCount = data.writeResults?.filter(r => r.success).length || 0;
  console.log(`  ✓ ${successCount} books added to ${books[0]?.addedBy || uid}'s library`);
}

// Add friend request
async function addFriendRequest(senderId, receiverId, status, idToken) {
  const requestId = `fr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const url = `${FIRESTORE_URL}/friendRequests/${requestId}`;

  // Use sender's token
  const senderToken = await signInAndGetToken(
    `${senderId.replace('_', '')}@test@iraval.app`.replace('test@', '_test@'),
    PASSWORD
  );

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${senderToken}`,
    },
    body: JSON.stringify({
      fields: {
        senderId: { stringValue: senderId },
        receiverId: { stringValue: receiverId },
        status: { stringValue: status },
        sentAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Add friend request error: ${response.statusText}`);
  }
  console.log(`  ✓ Friend request: ${senderId} → ${receiverId} (${status})`);
}

// Add exchange request
async function addExchange(senderId, exchangeData, idToken) {
  const exchangeId = `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const url = `${FIRESTORE_URL}/exchanges/${exchangeId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
    body: JSON.stringify({
      fields: {
        bookId: { stringValue: exchangeData.bookId },
        bookTitle: { stringValue: exchangeData.bookTitle },
        bookAuthor: { stringValue: exchangeData.bookAuthor },
        senderId: { stringValue: exchangeData.senderId },
        receiverId: { stringValue: exchangeData.receiverId },
        status: { stringValue: exchangeData.status },
        note: { stringValue: exchangeData.note || '' },
        requestedAt: { timestampValue: new Date().toISOString() },
        ...(exchangeData.respondedAt ? {
          respondedAt: { timestampValue: exchangeData.respondedAt },
        } : {}),
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Add exchange error: ${response.statusText}`);
  }
  console.log(`  ✓ Exchange: ${exchangeData.bookTitle} (${exchangeData.status})`);
}

// Main seeding function
async function seedTestData() {
  console.log('\n========================================');
  console.log('  Iraval Test Data Seeder');
  console.log('========================================\n');

  let uidMap = {};

  try {
    // Step 1: Create users
    console.log('Step 1: Creating test users...');
    for (const user of USERS) {
      try {
        const result = await createUser(user.email, PASSWORD, user.displayName);
        uidMap[user.username] = result.uid;
        console.log(`  ✓ Created: ${user.displayName} (@${user.username})`);
      } catch (err) {
        if (err.message.includes('EMAIL_EXISTS')) {
          console.log(`  ~ User exists: ${user.displayName} (@${user.username})`);
          // Try to sign in to get UID
          try {
            const token = await signInAndGetToken(user.email, PASSWORD);
            // Extract UID from token (we'll get it from Firestore)
            uidMap[user.username] = null; // Will get from Firestore
          } catch (e) {
            console.log(`  ✗ Error for ${user.displayName}: ${e.message}`);
          }
        } else {
          console.log(`  ✗ Error creating ${user.displayName}: ${err.message}`);
        }
      }
    }

    // Step 2: Create user profiles in Firestore
    console.log('\nStep 2: Creating user profiles in Firestore...');
    for (const user of USERS) {
      try {
        const token = await signInAndGetToken(user.email, PASSWORD);
        // We need the actual UID - let's get it from the sign-in response
        const url = `${BASE_URL}/accounts:signInWithPassword?key=${API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: user.email, password: PASSWORD, returnSecureToken: true }),
        });
        const data = await response.json();
        const uid = data.localId;
        uidMap[user.username] = uid;

        await addUserProfile(uid, {
          ...user,
          email: user.email,
          displayName: user.displayName,
        }, token);
      } catch (err) {
        console.log(`  ✗ Error creating profile for ${user.displayName}: ${err.message}`);
      }
    }

    // Step 3: Add books to each user's library
    console.log('\nStep 3: Adding books to libraries...');
    for (const [username, books] of Object.entries(USER_BOOKS)) {
      try {
        const uid = uidMap[username];
        if (!uid) {
          console.log(`  ✗ Skipping ${username}: UID not found`);
          continue;
        }
        const token = await signInAndGetToken(
          USERS.find(u => u.username === username).email,
          PASSWORD
        );
        await addBooks(uid, books, token);
      } catch (err) {
        console.log(`  ✗ Error adding books for ${username}: ${err.message}`);
      }
    }

    // Step 4: Add friend requests
    console.log('\nStep 4: Creating friend requests...');
    for (const fr of TEST_SCENARIOS.friendRequests) {
      try {
        const senderUsername = fr.senderId;
        const senderUser = USERS.find(u => u.username === senderUsername);
        if (!senderUser) continue;
        const token = await signInAndGetToken(senderUser.email, PASSWORD);
        await addFriendRequest(fr.senderId, fr.receiverId, fr.status, token);
      } catch (err) {
        console.log(`  ✗ Error adding friend request: ${err.message}`);
      }
    }

    // Step 5: Add exchange requests
    console.log('\nStep 5: Creating exchange requests...');
    for (const ex of TEST_SCENARIOS.exchanges) {
      try {
        const senderUsername = ex.senderId;
        const senderUser = USERS.find(u => u.username === senderUsername);
        if (!senderUser) continue;
        const token = await signInAndGetToken(senderUser.email, PASSWORD);
        await addExchange(senderUsername, ex, token);
      } catch (err) {
        console.log(`  ✗ Error adding exchange: ${err.message}`);
      }
    }

    // Summary
    console.log('\n========================================');
    console.log('  Test Data Seeding Complete!');
    console.log('========================================\n');
    console.log('Test Users Summary:');
    USERS.forEach(user => {
      const bookCount = (USER_BOOKS[user.username] || []).length;
      const uid = uidMap[user.username] || 'N/A';
      console.log(`  ${user.displayName} (@${user.username})`);
      console.log(`    UID: ${uid}`);
      console.log(`    City: ${user.city} (${user.zipCode})`);
      console.log(`    Books: ${bookCount}`);
      console.log(`    Password: ${PASSWORD}`);
      console.log('');
    });

    console.log('\nTest Scenarios Created:');
    console.log(`  Friend Requests: ${TEST_SCENARIOS.friendRequests.length}`);
    console.log(`  Exchanges: ${TEST_SCENARIOS.exchanges.length}`);
    console.log('\nNext steps:');
    console.log('  1. Open http://localhost:5173');
    console.log('  2. Login with any test user');
    console.log('  3. Test all features!');
    console.log('');

  } catch (err) {
    console.error('\n❌ Seeding failed:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Firebase Authentication is enabled');
    console.error('  2. Make sure email/password sign-in is enabled');
    console.error('  3. Check that the API key is valid');
    console.error('  4. Run: firebase login');
    process.exit(1);
  }
}

// Run the seeder
seedTestData().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
