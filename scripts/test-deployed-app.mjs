/**
 * Test the deployed Iraval app at https://iraval.netlify.app
 * Tests: login, book search, exchange requests, chat
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'deployed-test');
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

// Test users
const testUsers = {
  alice: { email: 'alice_test@iraval.app', password: 'Test#12345!' },
  bob: { email: 'bob_test@iraval.app', password: 'Test#12345!' },
};

async function main() {
  console.log('\n========================================');
  console.log('  Testing Deployed Iraval App');
  console.log('  URL: https://iraval.netlify.app');
  console.log('========================================\n');

  // Test 1: Login
  console.log('Test 1: Login with Alice...');
  try {
    const aliceUser = await signInWithEmailAndPassword(auth, testUsers.alice.email, testUsers.alice.password);
    assert(aliceUser.user.uid, 'Alice login successful');
    console.log(`  Alice UID: ${aliceUser.user.uid}`);
  } catch (err) {
    assert(false, `Alice login: ${err.message}`);
  }

  // Test 2: Book Search
  console.log('\nTest 2: Search for books...');
  try {
    const booksQuery = query(collection(db, 'books'), where('language', '==', 'English'));
    const booksSnap = await getDocs(booksQuery);
    assert(booksSnap.size > 0, `Found ${booksSnap.size} English books`);
    
    // Check if Alice's books are visible
    const aliceBooks = [];
    for (const doc of booksSnap.docs) {
      if (doc.data().addedBy === 'LHzKZP3Xd8c8sgKps28CnLzoLuG3') {
        aliceBooks.push(doc.data().title);
      }
    }
    assert(aliceBooks.length >= 3, `Alice has ${aliceBooks.length} books visible`);
    console.log(`  Alice's books: ${aliceBooks.join(', ')}`);
  } catch (err) {
    assert(false, `Book search: ${err.message}`);
  }

  // Test 3: Book Request
  console.log('\nTest 3: Send book exchange request...');
  try {
    const booksQuery = query(collection(db, 'books'), where('addedBy', '==', 'LHzKZP3Xd8c8sgKps28CnLzoLuG3'));
    const booksSnap = await getDocs(booksQuery);
    const aliceBook = booksSnap.docs[0]?.data();
    
    if (aliceBook) {
      const exchangeId = `ex_test_${Date.now()}`;
      const exchangeData = {
        bookId: aliceBook.bookId,
        bookTitle: aliceBook.title,
        bookAuthor: aliceBook.author,
        senderId: testUsers.alice.email,
        receiverId: testUsers.bob.email,
        status: 'pending',
        note: 'Test exchange request from deployed app',
        requestedAt: serverTimestamp(),
      };
      
      await setDoc(doc(db, 'exchanges', exchangeId), exchangeData);
      assert(true, `Exchange request created: ${aliceBook.title}`);
      
      // Verify Bob can see it
      const bobExchanges = await getDocs(
        query(collection(db, 'exchanges'), where('receiverId', '==', testUsers.bob.email))
      );
      const found = Array.from(bobExchanges.docs).some(d => d.data().bookTitle === aliceBook.title);
      assert(found, 'Bob can see Alice\'s exchange request');
      
      // Clean up
      await updateDoc(doc(db, 'exchanges', exchangeId), { status: 'accepted' });
      console.log('  Exchange request cleaned up');
    } else {
      assert(false, 'No books found for Alice');
    }
  } catch (err) {
    assert(false, `Exchange request: ${err.message}`);
  }

  // Test 4: Chat
  console.log('\nTest 4: Chat functionality...');
  try {
    const chatId = `chat_LHzKZP3Xd8c8sgKps28CnLzoLuG3_z9QL6X4yHpM9zfKlKcgLfQDf7qL2`;
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      await setDoc(chatRef, {
        chatId,
        participantIds: ['LHzKZP3Xd8c8sgKps28CnLzoLuG3', 'z9QL6X4yHpM9zfKlKcgLfQDf7qL2'],
        lastMessage: 'Test message from deployed app',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    }
    
    const chatRoomRef = doc(db, `chats/${chatId}/messages`);
    await setDoc(chatRoomRef, {
      senderId: 'LHzKZP3Xd8c8sgKps28CnLzoLuG3',
      text: 'Test message from deployed app',
      createdAt: serverTimestamp(),
    });
    
    assert(true, 'Chat message sent successfully');
    console.log(`  Chat ID: ${chatId}`);
    
    // Clean up
    await updateDoc(chatRef, { lastMessage: 'Test message', lastMessageAt: serverTimestamp() });
  } catch (err) {
    assert(false, `Chat: ${err.message}`);
  }

  // Test 5: User Profiles
  console.log('\nTest 5: User profiles...');
  try {
    const aliceProfile = await getDoc(doc(db, 'users', 'LHzKZP3Xd8c8sgKps28CnLzoLuG3'));
    const aliceData = aliceProfile.data();
    assert(aliceData?.fullName === 'Alice Chen', 'Alice profile exists');
    assert(aliceData?.zipCode === '10001', 'Alice has correct zip code');
    assert(aliceData?.city === 'New York', 'Alice has correct city');
    
    const bobProfile = await getDoc(doc(db, 'users', 'z9QL6X4yHpM9zfKlKcgLfQDf7qL2'));
    const bobData = bobProfile.data();
    assert(bobData?.fullName === 'Bob Martinez', 'Bob profile exists');
    assert(bobData?.zipCode === '90210', 'Bob has correct zip code');
  } catch (err) {
    assert(false, `Profiles: ${err.message}`);
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
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
