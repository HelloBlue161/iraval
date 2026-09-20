/**
 * Fix Firestore data using direct REST API calls
 */
const API_KEY = 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA';
const PROJECT_ID = 'iraval-7733e';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

// User UIDs from the previous run
const USERS = [
  { uid: 'LHzKZP3Xd8c8sgKps28CnLzoLuG3', username: 'alice_nyc', displayName: 'Alice Chen', email: 'alice_test@iraval.app', birthDate: '1990-05-15', zipCode: '10001', city: 'New York' },
  { uid: 'z9QL6X4yHpM9zfKlKcgLfQDf7qL2', username: 'bob_la', displayName: 'Bob Martinez', email: 'bob_test@iraval.app', birthDate: '1988-11-22', zipCode: '90210', city: 'Beverly Hills' },
  { uid: 'nlTRYSyUfYhTGD7OBurZpd1YGZW2', username: 'carol_chi', displayName: 'Carol Johnson', email: 'carol_test@iraval.app', birthDate: '1992-03-08', zipCode: '60601', city: 'Chicago' },
  { uid: 'FK0e0k8DMnhSh2nLCmIOK8Dbahz2', username: 'david_miami', displayName: 'David Patel', email: 'david_test@iraval.app', birthDate: '1995-07-30', zipCode: '33101', city: 'Miami' },
  { uid: 'QHnN1MBLnMc9GXzG0AW9S2PIfjC2', username: 'eve_sf', displayName: 'Eve Nakamura', email: 'eve_test@iraval.app', birthDate: '1993-01-12', zipCode: '94101', city: 'San Francisco' },
  { uid: 'lWslsWEtR9NkwGVNBvG9NKtA8tY2', username: 'frank_dallas', displayName: 'Frank Okafor', email: 'frank_test@iraval.app', birthDate: '1987-09-25', zipCode: '75201', city: 'Dallas' },
];

const USER_BOOKS = {
  'LHzKZP3Xd8c8sgKps28CnLzoLuG3': [
    { bookId: 'book_alice_1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', language: 'English' },
    { bookId: 'book_alice_2', title: '1984', author: 'George Orwell', language: 'English' },
    { bookId: 'book_alice_3', title: 'To Kill a Mockingbird', author: 'Harper Lee', language: 'English' },
  ],
  'z9QL6X4yHpM9zfKlKcgLfQDf7qL2': [
    { bookId: 'book_bob_1', title: 'Dune', author: 'Frank Herbert', language: 'English' },
    { bookId: 'book_bob_2', title: 'Clean Code', author: 'Robert C. Martin', language: 'English' },
    { bookId: 'book_bob_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
  ],
  'nlTRYSyUfYhTGD7OBurZpd1YGZW2': [
    { bookId: 'book_carol_1', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
    { bookId: 'book_carol_2', title: 'Pride and Prejudice', author: 'Jane Austen', language: 'English' },
  ],
  'FK0e0k8DMnhSh2nLCmIOK8Dbahz2': [
    { bookId: 'book_david_1', title: 'Atomic Habits', author: 'James Clear', language: 'English' },
    { bookId: 'book_david_2', title: 'The Alchemist', author: 'Paulo Coelho', language: 'Portuguese' },
    { bookId: 'book_david_3', title: 'நீதி நெறி', author: 'Thiruvalluvar', language: 'Tamil' },
  ],
  'QHnN1MBLnMc9GXzG0AW9S2PIfjC2': [
    { bookId: 'book_eve_1', title: 'Meditations', author: 'Marcus Aurelius', language: 'English' },
    { bookId: 'book_eve_2', title: 'The Lean Startup', author: 'Eric Ries', language: 'English' },
    { bookId: 'book_eve_3', title: 'கலவியல்', author: 'Bharathiar', language: 'Tamil' },
  ],
  'lWslsWEtR9NkwGVNBvG9NKtA8tY2': [
    { bookId: 'book_frank_1', title: 'The Hobbit', author: 'J.R.R. Tolkien', language: 'English' },
    { bookId: 'book_frank_2', title: 'Brave New World', author: 'Aldous Huxley', language: 'English' },
    { bookId: 'book_frank_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
    { bookId: 'book_frank_4', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
    { bookId: 'book_frank_5', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', language: 'English' },
  ],
};

async function createUserProfile(user) {
  const url = `${FIRESTORE_URL}/users/${user.uid}`;
  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: {
        email: { stringValue: user.email },
        username: { stringValue: user.username },
        fullName: { stringValue: user.displayName },
        birthDate: { stringValue: user.birthDate },
        zipCode: { stringValue: user.zipCode },
        city: { stringValue: user.city },
        profileImageURL: { stringValue: '' },
        createdAt: { timestampValue: new Date().toISOString() },
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`User profile error: ${response.statusText}`);
  }
  return response.json();
}

async function addBooks(uid, books) {
  const batchUrl = `${FIRESTORE_URL}:batchWrite`;
  const writes = books.map(book => ({
    update: {
      name: `${FIRESTORE_URL}/users/${uid}/books/${book.bookId}`,
      fields: {
        title: { stringValue: book.title },
        author: { stringValue: book.author },
        language: { stringValue: book.language },
        addedBy: { stringValue: uid },
        addedAt: { timestampValue: new Date().toISOString() },
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
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes }),
  });

  const data = await response.json();
  const successCount = data.writeResults?.filter(r => r.success).length || 0;
  return successCount;
}

async function addFriendRequest(senderId, receiverId, status) {
  const requestId = `fr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const url = `${FIRESTORE_URL}/friendRequests/${requestId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
    throw new Error(`Friend request error: ${response.statusText}`);
  }
}

async function addExchange(exchangeData) {
  const exchangeId = `ex_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const url = `${FIRESTORE_URL}/exchanges/${exchangeId}`;

  const response = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
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
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Exchange error: ${response.statusText}`);
  }
}

async function main() {
  console.log('\n========================================');
  console.log('  Fixing Firestore Data');
  console.log('========================================\n');

  // Create user profiles
  console.log('Step 1: Creating user profiles...');
  for (const user of USERS) {
    try {
      await createUserProfile(user);
      console.log(`  ✓ Created profile for ${user.displayName}`);
    } catch (err) {
      console.log(`  ✗ Error for ${user.displayName}: ${err.message}`);
    }
  }

  // Add books
  console.log('\nStep 2: Adding books to libraries...');
  for (const [uid, books] of Object.entries(USER_BOOKS)) {
    try {
      const count = await addBooks(uid, books);
      console.log(`  ✓ Added ${count} books`);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }

  // Add friend requests
  console.log('\nStep 3: Creating friend requests...');
  const friendRequests = [
    { senderId: 'alice_nyc', receiverId: 'bob_la', status: 'pending' },
    { senderId: 'bob_la', receiverId: 'carol_chi', status: 'accepted' },
    { senderId: 'carol_chi', receiverId: 'bob_la', status: 'accepted' },
  ];
  for (const fr of friendRequests) {
    try {
      await addFriendRequest(fr.senderId, fr.receiverId, fr.status);
      console.log(`  ✓ Friend request: ${fr.senderId} → ${fr.receiverId} (${fr.status})`);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }

  // Add exchanges
  console.log('\nStep 4: Creating exchange requests...');
  const exchanges = [
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
    },
  ];
  for (const ex of exchanges) {
    try {
      await addExchange(ex);
      console.log(`  ✓ Exchange: ${ex.bookTitle} (${ex.status})`);
    } catch (err) {
      console.log(`  ✗ Error: ${err.message}`);
    }
  }

  console.log('\n========================================');
  console.log('  Firestore Data Complete!');
  console.log('========================================\n');
  console.log('Test Users Summary:');
  USERS.forEach(user => {
    const bookCount = (USER_BOOKS[user.uid] || []).length;
    console.log(`  ${user.displayName} (@${user.username}) - ${user.city} - ${bookCount} books`);
  });
  console.log('\nNext steps:');
  console.log('  1. Start the web app: npm run dev');
  console.log('  2. Login with any test user');
  console.log('  3. Test all features!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
