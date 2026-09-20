// Test flows for Iraval web app
// Tests: book visibility, exchange requests, chat
// Run: node test_flows.mjs
import { initializeApp } from '@firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
} from '@firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  where,
  getDocs,
} from '@firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'test-flows');
const auth = getAuth(app);
const db = getFirestore(app);

// Our test users - UIDs from debug output
const users = {
  alice: { email: 'mob_test1@iraval.test', uid: 'l72cFQo1qQQoZ62kWO0RrvrxrDC2', name: 'Alice Chen', zip: '10001', city: 'New York' },
  bob:   { email: 'bob.bh@iraval.test', uid: 'rj7WmmjjXnhKFU7kSBrj4tpsHDi2', name: 'Bob Martinez', zip: '90210', city: 'Beverly Hills' },
  carol: { email: 'carol.chi@iraval.test', uid: 'ohs4Wgh8CuhVjMq766cKYiQqKKp2', name: 'Carol Johnson', zip: '60601', city: 'Chicago' },
  david: { email: 'david.mia@iraval.test', uid: 'YhLugVKdTCQj715d5WwiC2yDr9V2', name: 'David Patel', zip: '33101', city: 'Miami' },
  eve:   { email: 'eve.sf@iraval.test', uid: 'LlkpXkseZZhlPEsExhFQyTwk3C52', name: 'Eve Nakamura', zip: '94101', city: 'San Francisco' },
  frank: { email: 'frank.dal@iraval.test', uid: 'nKTIOQM4kTNUHH19VGcKrKiMW8u1', name: 'Frank Okafor', zip: '75201', city: 'Dallas' },
};

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName}`);
    failed++;
  }
}

async function signIn(email) {
  await signOut(auth);
  await new Promise((r) => setTimeout(r, 200));
  await signInWithEmailAndPassword(auth, email, 'Test#12345');
  await new Promise((r) => setTimeout(r, 300));
}

// Helper: find a user doc by UID (primary docs only)
async function getUserDoc(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

async function searchAllBooks(title) {
  // Same logic as the app's searchAllBooks
  const usersSnap = await getDocs(collection(db, 'users'));
  const results = [];
  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    // Skip non-primary docs (has uid field that doesn't match doc id)
    if (userData?.uid && userData.uid !== userDoc.id) continue;
    const booksSnap = await getDocs(collection(db, 'users', userDoc.id, 'books'));
    for (const bookDoc of booksSnap.docs) {
      const bookData = bookDoc.data();
      if (bookData?.title?.toLowerCase().includes(title.toLowerCase())) {
        results.push({
          bookId: bookDoc.id,
          title: bookData.title,
          author: bookData.author,
          addedBy: userDoc.id,
          addedByFullName: userData.fullName || '',
          addedByCity: userData.city || '',
          addedByZipCode: userData.zipCode || '',
        });
      }
    }
  }
  return results;
}

async function searchUsersWithBook(bookTitle, excludeUid) {
  const usersSnap = await getDocs(collection(db, 'users'));
  const results = [];
  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();
    if (userData?.uid && userData.uid !== uid) continue;
    if (excludeUid && uid === excludeUid) continue;
    const booksSnap = await getDocs(collection(db, 'users', uid, 'books'));
    for (const bookDoc of booksSnap.docs) {
      if (bookDoc.data()?.title?.toLowerCase().includes(bookTitle.toLowerCase())) {
        results.push({
          id: uid,
          fullName: userData.fullName || '',
          zipCode: userData.zipCode || '',
        });
        break;
      }
    }
  }
  return results;
}

async function getExchanges(uid) {
  const q1 = query(collection(db, 'exchanges'), where('senderId', '==', uid));
  const q2 = query(collection(db, 'exchanges'), where('receiverId', '==', uid));
  const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const result = [];
  s1.forEach(d => result.push({ id: d.id, ...d.data() }));
  s2.forEach(d => result.push({ id: d.id, ...d.data() }));
  return result;
}

async function testBookVisibility() {
  console.log('\n=== Test 1: Book Visibility Across Users ===');

  // Alice should see all books from all primary users
  await signIn(users.alice.email);
  const allBooks = await searchAllBooks('');
  const uniqueUsers = new Set(allBooks.map(b => b.addedBy));
  console.log(`  Alice sees ${allBooks.length} total books from ${uniqueUsers.size} primary users`);
  assert(allBooks.length >= 19, `Alice sees all our books (${allBooks.length} >= 19)`);

  // Alice should find Bob's "Dune" specifically
  const duneResults = await searchAllBooks('Dune');
  const bobDune = duneResults.find(r => r.addedBy === users.bob.uid);
  console.log(`  Alice searches "Dune" -> ${duneResults.length} result(s), ${bobDune ? 1 : 0} from Bob`);
  assert(bobDune !== undefined, 'Alice finds Bob\'s Dune');

  // Bob should find Carol's "Sapiens"
  await signIn(users.bob.email);
  const sapiensResults = await searchAllBooks('Sapiens');
  const carolSapiens = sapiensResults.find(r => r.addedBy === users.carol.uid);
  console.log(`  Bob searches "Sapiens" -> ${sapiensResults.length} result(s), ${carolSapiens ? 1 : 0} from Carol`);
  assert(carolSapiens !== undefined, 'Bob finds Carol\'s Sapiens');

  // David should find Alice's "1984"
  await signIn(users.david.email);
  const oneNinetyFourResults = await searchAllBooks('1984');
  const aliceOneNinetyFour = oneNinetyFourResults.find(r => r.addedBy === users.alice.uid);
  console.log(`  David searches "1984" -> ${oneNinetyFourResults.length} result(s), ${aliceOneNinetyFour ? 1 : 0} from Alice`);
  assert(aliceOneNinetyFour !== undefined, 'David finds Alice\'s 1984');

  // Eve should find her own books
  await signIn(users.eve.email);
  const eveBooks = await searchAllBooks('Clean');
  const eveClean = eveBooks.find(r => r.addedBy === users.eve.uid);
  console.log(`  Eve searches "Clean" -> ${eveBooks.length} result(s), ${eveClean ? 1 : 0} from Eve`);
  assert(eveClean !== undefined, 'Eve finds her own Clean Code');

  // Frank should see many books with "The"
  await signIn(users.frank.email);
  const theBooks = await searchAllBooks('The');
  const frankTheBooks = theBooks.filter(r => r.addedBy === users.frank.uid);
  console.log(`  Frank searches "The" -> ${theBooks.length} total, ${frankTheBooks.length} from Frank`);
  assert(theBooks.length >= 8, `Frank sees multiple "The" books (${theBooks.length} >= 8)`);
}

async function testUserSearch() {
  console.log('\n=== Test 2: Find Users With a Book ===');

  // Alice searches for users with "Dune"
  await signIn(users.alice.email);
  const duneUsers = await searchUsersWithBook('Dune', users.alice.uid);
  const bobDune = duneUsers.find(u => u.id === users.bob.uid);
  console.log(`  Alice finds ${duneUsers.length} user(s) with "Dune"`);
  assert(bobDune !== undefined, 'Alice finds Bob with Dune');

  // Bob searches for users with "Sapiens"
  await signIn(users.bob.email);
  const sapiensUsers = await searchUsersWithBook('Sapiens', users.bob.uid);
  const carolSapiens = sapiensUsers.find(u => u.id === users.carol.uid);
  console.log(`  Bob finds ${sapiensUsers.length} user(s) with "Sapiens"`);
  assert(carolSapiens !== undefined, 'Bob finds Carol with Sapiens');

  // Carol searches for users with "Meditations"
  await signIn(users.carol.email);
  const medUsers = await searchUsersWithBook('Meditations', users.carol.uid);
  const eveMed = medUsers.find(u => u.id === users.eve.uid);
  console.log(`  Carol finds ${medUsers.length} user(s) with "Meditations"`);
  assert(eveMed !== undefined, 'Carol finds Eve with Meditations');
}

async function testExchangeFlow() {
  console.log('\n=== Test 3: Exchange Request Flow ===');

  // David requests to borrow Alice's "1984"
  await signIn(users.david.email);
  const exId = `test_ex_${Date.now()}`;
  await setDoc(doc(db, 'exchanges', exId), {
    bookId: 'book_alice_2',
    bookTitle: '1984',
    bookAuthor: 'George Orwell',
    senderId: users.david.uid,
    receiverId: users.alice.uid,
    status: 'pending',
    requestedAt: new Date(),
    note: 'I would love to read this classic!',
  });
  console.log(`  David sends exchange request for "1984"`);

  // Verify request appears in David's exchanges
  const davidExchanges = await getExchanges(users.david.uid);
  const myRequest = davidExchanges.find(e => e.id === exId);
  assert(myRequest !== undefined, 'David sees his own pending request');
  assert(myRequest?.status === 'pending', 'Request status is pending');

  // Verify request appears in Alice's exchanges
  await signIn(users.alice.email);
  const aliceExchanges = await getExchanges(users.alice.uid);
  const aliceReceived = aliceExchanges.find(e => e.id === exId);
  assert(aliceReceived !== undefined, 'Alice receives David\'s request');
  assert(aliceReceived?.status === 'pending', 'Request is pending for Alice');

  // Alice accepts the request
  await setDoc(doc(db, 'exchanges', exId), {
    status: 'accepted',
    respondedAt: new Date(),
  }, { merge: true });
  console.log(`  Alice accepts David\'s request`);

  // Verify status changed
  const updated = await getDoc(doc(db, 'exchanges', exId));
  assert(updated.data()?.status === 'accepted', 'Exchange status is now accepted');
}

async function testChatFlow() {
  console.log('\n=== Test 4: Chat Flow ===');

  // Alice chats with David about the exchange
  await signIn(users.alice.email);

  // Chat ID follows the pattern chat_{sorted_uids}
  const chatIds = [users.alice.uid, users.david.uid].sort();
  const chatId = `chat_${chatIds[0]}_${chatIds[1]}`;
  console.log(`  Chat room: ${chatId}`);

  // Alice sends first message
  await setDoc(doc(db, 'chats', chatId, 'messages', 'msg_alice_1'), {
    chatId,
    senderId: users.alice.uid,
    text: 'Hi David! I accepted your request for 1984. When can we meet?',
    timestamp: new Date(),
  });
  console.log(`  Alice sends message`);

  // David replies
  await signIn(users.david.email);
  await setDoc(doc(db, 'chats', chatId, 'messages', 'msg_david_1'), {
    chatId,
    senderId: users.david.uid,
    text: 'Great! I\'m in Miami. How about next Tuesday at a coffee shop?',
    timestamp: new Date(),
  });
  console.log(`  David replies`);

  // Alice sends third message
  await signIn(users.alice.email);
  await setDoc(doc(db, 'chats', chatId, 'messages', 'msg_alice_2'), {
    chatId,
    senderId: users.alice.uid,
    text: 'Sounds good! Let me know the exact location.',
    timestamp: new Date(),
  });
  console.log(`  Alice sends follow-up`);

  // Verify all 3 messages exist
  const msgsSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
  const msgs = msgsSnap.docs.map(d => ({
    senderId: d.data().senderId,
    text: d.data().text,
  }));
  console.log(`  Chat has ${msgs.length} messages`);
  assert(msgs.length === 3, `Chat has all 3 messages (${msgs.length})`);

  // Verify message counts by sender
  const aliceMsgs = msgs.filter(m => m.senderId === users.alice.uid);
  const davidMsgs = msgs.filter(m => m.senderId === users.david.uid);
  assert(aliceMsgs.length === 2, 'Alice sent 2 messages');
  assert(davidMsgs.length === 1, 'David sent 1 message');
}

async function testUserProfiles() {
  console.log('\n=== Test 5: User Profiles ===');

  for (const [key, u] of Object.entries(users)) {
    await signIn(u.email);
    const data = await getUserDoc(u.uid);
    assert(data !== null, `${u.name} profile exists`);
    assert(data?.zipCode === u.zip, `${u.name} has correct zip ${u.zip}`);
    assert(data?.city === u.city, `${u.name} has correct city ${u.city}`);
    // Note: fullName is checked separately since we create the doc ourselves
  }
}

async function main() {
  console.log('=== Iraval Test Flows ===\n');
  console.log('Testing with 6 test users across different zip codes\n');

  await testBookVisibility();
  await testUserSearch();
  await testExchangeFlow();
  await testChatFlow();
  await testUserProfiles();

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) {
    console.log('\nSome tests FAILED!');
    process.exit(1);
  } else {
    console.log('\nAll tests PASSED!');
  }
}

main().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
