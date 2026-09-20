/**
 * Create Test Data for Iraval
 * Uses Firebase Auth REST API to get tokens, then Firestore REST API
 */
const API_KEY = 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA';
const PROJECT_ID = 'iraval-7733e';
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`;
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

const PASSWORD = 'Test#12345!';

const USERS = [
  { email: 'alice_test@iraval.app', username: 'alice_nyc', displayName: 'Alice Chen', birthDate: '1990-05-15', zipCode: '10001', city: 'New York' },
  { email: 'bob_test@iraval.app', username: 'bob_la', displayName: 'Bob Martinez', birthDate: '1988-11-22', zipCode: '90210', city: 'Beverly Hills' },
  { email: 'carol_test@iraval.app', username: 'carol_chi', displayName: 'Carol Johnson', birthDate: '1992-03-08', zipCode: '60601', city: 'Chicago' },
  { email: 'david_test@iraval.app', username: 'david_miami', displayName: 'David Patel', birthDate: '1995-07-30', zipCode: '33101', city: 'Miami' },
  { email: 'eve_test@iraval.app', username: 'eve_sf', displayName: 'Eve Nakamura', birthDate: '1993-01-12', zipCode: '94101', city: 'San Francisco' },
  { email: 'frank_test@iraval.app', username: 'frank_dallas', displayName: 'Frank Okafor', birthDate: '1987-09-25', zipCode: '75201', city: 'Dallas' },
];

const USER_BOOKS = {
  'alice_test@iraval.app': [
    { bookId: 'book_alice_1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', language: 'English' },
    { bookId: 'book_alice_2', title: '1984', author: 'George Orwell', language: 'English' },
    { bookId: 'book_alice_3', title: 'To Kill a Mockingbird', author: 'Harper Lee', language: 'English' },
  ],
  'bob_test@iraval.app': [
    { bookId: 'book_bob_1', title: 'Dune', author: 'Frank Herbert', language: 'English' },
    { bookId: 'book_bob_2', title: 'Clean Code', author: 'Robert C. Martin', language: 'English' },
    { bookId: 'book_bob_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
  ],
  'carol_test@iraval.app': [
    { bookId: 'book_carol_1', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
    { bookId: 'book_carol_2', title: 'Pride and Prejudice', author: 'Jane Austen', language: 'English' },
  ],
  'david_test@iraval.app': [
    { bookId: 'book_david_1', title: 'Atomic Habits', author: 'James Clear', language: 'English' },
    { bookId: 'book_david_2', title: 'The Alchemist', author: 'Paulo Coelho', language: 'Portuguese' },
    { bookId: 'book_david_3', title: 'நீதி நெறி', author: 'Thiruvalluvar', language: 'Tamil' },
  ],
  'eve_test@iraval.app': [
    { bookId: 'book_eve_1', title: 'Meditations', author: 'Marcus Aurelius', language: 'English' },
    { bookId: 'book_eve_2', title: 'The Lean Startup', author: 'Eric Ries', language: 'English' },
    { bookId: 'book_eve_3', title: 'கலவியல்', author: 'Bharathiar', language: 'Tamil' },
  ],
  'frank_test@iraval.app': [
    { bookId: 'book_frank_1', title: 'The Hobbit', author: 'J.R.R. Tolkien', language: 'English' },
    { bookId: 'book_frank_2', title: 'Brave New World', author: 'Aldous Huxley', language: 'English' },
    { bookId: 'book_frank_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
    { bookId: 'book_frank_4', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
    { bookId: 'book_frank_5', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', language: 'English' },
  ],
};

async function signInAndGetToken(email, password) {
  const response = await fetch(AUTH_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });

  const data = await response.json();
  if (data.error) {
    throw new Error(`Auth error for ${email}: ${data.error.message}`);
  }
  return { uid: data.localId, idToken: data.idToken, email: data.email };
}

async function createUserProfile(user) {
  const { uid, idToken } = await signInAndGetToken(user.email, PASSWORD);
  const url = `${FIRESTORE_BASE}/users/${uid}`;
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${idToken}`,
    },
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
    const errorText = await response.text();
    throw new Error(`User profile error: ${response.status} - ${errorText}`);
  }
  return uid;
}

async function addBooksToUser(user) {
  const { idToken } = await signInAndGetToken(user.email, PASSWORD);
  const books = USER_BOOKS[user.email] || [];
  
  // Add books one by one
  for (const book of books) {
    const url = `${FIRESTORE_BASE}/users/${user.email}/books/${book.bookId}`;
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        fields: {
          title: { stringValue: book.title },
          author: { stringValue: book.author },
          language: { stringValue: book.language },
          addedBy: { stringValue: user.email },
          addedAt: { timestampValue: new Date().toISOString() },
          bookStatus: { stringValue: 'available' },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`  ⚠ Book add error: ${response.status} - ${errorText}`);
    }
  }
  return books.length;
}

async function main() {
  console.log('\n========================================');
  console.log('  Creating Test Data for Iraval');
  console.log('========================================\n');

  try {
    // Test sign in first
    console.log('Testing Firebase Auth...');
    const testUser = await signInAndGetToken('alice_test@iraval.app', PASSWORD);
    console.log(`✓ Auth works! User UID: ${testUser.uid}`);

    // Create user profiles
    console.log('\nCreating user profiles...');
    for (const user of USERS) {
      try {
        const uid = await createUserProfile(user);
        console.log(`✓ ${user.displayName} (@${user.username}) - UID: ${uid}`);
      } catch (err) {
        console.log(`✗ ${user.displayName}: ${err.message}`);
      }
    }

    // Add books
    console.log('\nAdding books...');
    for (const user of USERS) {
      try {
        const count = await addBooksToUser(user);
        console.log(`✓ ${user.displayName}: ${count} books added`);
      } catch (err) {
        console.log(`✗ ${user.displayName}: ${err.message}`);
      }
    }

    console.log('\n========================================');
    console.log('  Test Data Creation Complete!');
    console.log('========================================\n');

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure Firebase Authentication is enabled');
    console.error('  2. Make sure email/password sign-in is enabled');
    console.error('  3. Check that the API key is valid');
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
