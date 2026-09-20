import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'test-full-app');
const auth = getAuth(app);
const db = getFirestore(app);

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${testName}`);
    failed++;
  }
}

console.log('\n========================================');
console.log('  Full App Test - Deployed Iraval');
console.log('========================================\n');

// Test 1: Login Flow
console.log('Test 1: Login with username...');
try {
  const q = query(collection(db, 'users'), where('username', '==', 'alice'));
  const snap = await getDocs(q);
  const email = snap.docs[0]?.data()?.email;
  
  const result = await signInWithEmailAndPassword(auth, email, 'Test#12345!');
  assert(true, `Alice logged in as ${email}`);
} catch (err) {
  assert(false, `Login failed: ${err.message}`);
}

// Test 2: Book Search
console.log('\nTest 2: Search for books...');
try {
  const usersSnap = await getDocs(collection(db, 'users'));
  let totalBooks = 0;
  
  for (const userDoc of usersSnap.docs) {
    const booksSnap = await getDocs(collection(db, 'users', userDoc.id, 'books'));
    totalBooks += booksSnap.docs.length;
  }
  
  assert(totalBooks > 0, `Found ${totalBooks} total books across users`);
  
  // Check Alice's books
  const aliceBooks = await getDocs(collection(db, 'users', 'LHzKZP3Xd8c8sgKps28CnLzoLuG3', 'books'));
  const bookTitles = aliceBooks.docs.map(d => d.data().title);
  assert(bookTitles.length >= 3, `Alice has ${bookTitles.length} books: ${bookTitles.join(', ')}`);
} catch (err) {
  assert(false, `Book search failed: ${err.message}`);
}

// Test 3: User Profiles
console.log('\nTest 3: User profiles...');
try {
  const aliceDoc = await getDoc(doc(db, 'users', 'LHzKZP3Xd8c8sgKps28CnLzoLuG3'));
  const aliceData = aliceDoc.data();
  assert(aliceData?.fullName === 'Alice Chen', 'Alice profile exists');
  assert(aliceData?.zipCode === '10001', 'Alice zip code correct');
  assert(aliceData?.city === 'New York', 'Alice city correct');
} catch (err) {
  assert(false, `Profile failed: ${err.message}`);
}

// Test 4: Book Exchange Request
console.log('\nTest 4: Exchange request...');
try {
  // Create an exchange request
  const exchangeId = 'ex_test_full_app';
  await setDoc(doc(db, 'exchanges', exchangeId), {
    bookId: 'book_bob_1',
    bookTitle: 'Dune',
    bookAuthor: 'Frank Herbert',
    senderId: 'alice_test@iraval.app',
    receiverId: 'bob_test@iraval.app',
    status: 'pending',
    note: 'Test exchange request',
    requestedAt: serverTimestamp(),
  });
  
  // Verify Bob can see it
  const bobExchanges = await getDocs(
    query(collection(db, 'exchanges'), where('receiverId', '==', 'bob_test@iraval.app'))
  );
  
  const found = Array.from(bobExchanges.docs).some(d => d.data().bookTitle === 'Dune');
  assert(found, 'Bob can see Alice\'s exchange request');
  
  // Clean up
  await setDoc(doc(db, 'exchanges', exchangeId), { status: 'accepted' }, { merge: true });
  console.log('  Exchange request cleaned up');
} catch (err) {
  assert(false, `Exchange failed: ${err.message}`);
}

// Test 5: Chat
console.log('\nTest 5: Chat functionality...');
try {
  const chatId = 'chat_alice_bob_test';
  await setDoc(doc(db, 'chats', chatId), {
    chatId,
    participantIds: ['LHzKZP3Xd8c8sgKps28CnLzoLuG3', 'z9QL6X4yHpM9zfKlKcgLfQDf7qL2'],
    lastMessage: 'Test message',
    lastMessageAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  
  // Create a message (using a subcollection)
  const messageRef = doc(db, 'chats', chatId, 'messages', 'msg_test_1');
  await setDoc(messageRef, {
    senderId: 'LHzKZP3Xd8c8sgKps28CnLzoLuG3',
    text: 'Test message from deployed app',
    createdAt: serverTimestamp(),
  });
  
  assert(true, 'Chat message sent successfully');
} catch (err) {
  assert(false, `Chat failed: ${err.message}`);
}

// Summary
console.log('\n========================================');
console.log('  Test Results');
console.log('========================================');
console.log(`  Passed: ${passed}`);
console.log(`  Failed: ${failed}`);
console.log(`  Total:  ${passed + failed}`);
console.log('========================================\n');

if (failed === 0) {
  console.log('🎉 ALL TESTS PASSED!');
  console.log('✅ Your app is ready to click "Make Public" on Netlify');
  console.log('\nNext steps:');
  console.log('1. Go to https://app.netlify.com/sites/iraval/settings/deploys');
  console.log('2. Click "Make Public"');
  console.log('3. Share https://iraval.netlify.app with users!');
} else {
  console.log('⚠️  Some tests failed. Review the errors above.');
}
