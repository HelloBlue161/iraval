/**
 * QA seed script for the Iraval web app.
 *
 * Uses the Firebase *client* SDK (same public config as the app), so it
 * exercises the real security rules exactly like the app does.
 *
 *   node scripts/qa-seed.mjs seed    - create QA users, books, exchanges, chats, friend requests
 *   node scripts/qa-seed.mjs verify  - read everything back through app-like queries and assert correctness
 *   node scripts/qa-seed.mjs clean   - delete all QA data (Firestore docs + Auth accounts)
 *
 * QA accounts are clearly marked: emails qa.<name>@iraval.test, names "QA ...".
 * Throwaway password: QaTest1234!
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  deleteUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const QA_PASSWORD = 'QaTest1234!';

const QA_USERS = [
  { tag: 'alice', fullName: 'QA Alice Chen', email: 'qa.alice@iraval.test', username: 'qa_alice', city: 'New York', zipCode: '10001', birthDate: '1990-05-14' },
  { tag: 'bob', fullName: 'QA Bob Martinez', email: 'qa.bob@iraval.test', username: 'qa_bob', city: 'Beverly Hills', zipCode: '90210', birthDate: '1988-11-02' },
  { tag: 'carol', fullName: 'QA Carol Johnson', email: 'qa.carol@iraval.test', username: 'qa_carol', city: 'Chicago', zipCode: '60601', birthDate: '1992-03-21' },
  { tag: 'david', fullName: 'QA David Patel', email: 'qa.david@iraval.test', username: 'qa_david', city: 'Miami', zipCode: '33101', birthDate: '1985-07-30' },
  { tag: 'eve', fullName: 'QA Eve Nakamura', email: 'qa.eve@iraval.test', username: 'qa_eve', city: 'San Francisco', zipCode: '94101', birthDate: '1995-01-11' },
];

const BOOKS = [
  { title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719' },
  { title: 'The Hobbit', author: 'J.R.R. Tolkien', isbn: '9780547928227' },
  { title: '1984', author: 'George Orwell', isbn: '9780451524935' },
  { title: 'To Kill a Mockingbird', author: 'Harper Lee', isbn: '9780061120084' },
  { title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', isbn: '9780743273565' },
  { title: 'Pride and Prejudice', author: 'Jane Austen', isbn: '9780141439518' },
  { title: 'The Catcher in the Rye', author: 'J.D. Salinger', isbn: '9780316769488' },
  { title: 'Brave New World', author: 'Aldous Huxley', isbn: '9780060850524' },
  { title: 'The Alchemist', author: 'Paulo Coelho', isbn: '9780061122415' },
  { title: 'Sapiens', author: 'Yuval Noah Harari', isbn: '9780062316097' },
  { title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292' },
  { title: 'The Midnight Library', author: 'Matt Haig', isbn: '9780525559474' },
];

// book indices per user tag
const USER_BOOKS = { alice: [0, 1, 2], bob: [3, 4, 5], carol: [6, 7], david: [8, 9], eve: [10, 11] };

const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;
const bookId = (tag, i) => `qa_${tag}_b${i}`;
const chatIdFor = (u1, u2) => `chat_${[u1, u2].sort().join('_')}`;

const byTag = {};
for (const u of QA_USERS) byTag[u.tag] = u;

async function signInAs(tag) {
  const u = byTag[tag];
  await signOut(auth).catch(() => {});
  const cred = await signInWithEmailAndPassword(auth, u.email, QA_PASSWORD);
  return cred.user.uid;
}

async function seed() {
  console.log('--- SEED: creating QA users ---');
  // 1. Create auth accounts + profiles + username registry + books
  for (const u of QA_USERS) {
    let uid;
    try {
      const cred = await createUserWithEmailAndPassword(auth, u.email, QA_PASSWORD);
      uid = cred.user.uid;
      console.log(`created auth account ${u.email}`);
    } catch (e) {
      if (e.code === 'auth/email-already-in-use') {
        const cred = await signInWithEmailAndPassword(auth, u.email, QA_PASSWORD);
        uid = cred.user.uid;
        console.log(`reusing existing account ${u.email}`);
      } else throw e;
    }
    u.uid = uid;
    await signOut(auth).catch(() => {});
    // sign back in as this user for profile writes (rules: owner-only)
    await signInWithEmailAndPassword(auth, u.email, QA_PASSWORD);
    await setDoc(doc(db, 'users', uid), {
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      birthDate: u.birthDate,
      zipCode: u.zipCode,
      city: u.city,
      profileImageURL: '',
      createdAt: new Date().toISOString(),
    });
    await setDoc(doc(db, 'usernames', u.username.toLowerCase()), { uid, email: u.email });
    for (const bi of USER_BOOKS[u.tag]) {
      const b = BOOKS[bi];
      await setDoc(doc(db, 'users', uid, 'books', bookId(u.tag, bi)), {
        title: b.title,
        author: b.author,
        coverImageURL: cover(b.isbn),
        addedBy: uid,
        addedAt: new Date().toISOString(),
        bookStatus: 'available',
        language: 'English',
      });
    }
    console.log(`profile + ${USER_BOOKS[u.tag].length} books for ${u.username} (${uid})`);
    await signOut(auth).catch(() => {});
  }

  console.log('--- SEED: exchanges ---');
  const exchanges = [
    { id: 'qa_ex_1', sender: 'alice', receiver: 'bob', status: 'pending', book: { tag: 'bob', i: 3 }, note: 'Hi! Would love to borrow this for two weeks.' },
    { id: 'qa_ex_2', sender: 'carol', receiver: 'alice', status: 'accepted', book: { tag: 'alice', i: 0 } },
    { id: 'qa_ex_3', sender: 'david', receiver: 'eve', status: 'pending', book: { tag: 'eve', i: 10 } },
    { id: 'qa_ex_4', sender: 'bob', receiver: 'carol', status: 'accepted', book: { tag: 'carol', i: 7 } },
  ];
  for (const ex of exchanges) {
    const senderUid = await signInAs(ex.sender);
    const receiverUid = byTag[ex.receiver].uid;
    const exRef = doc(db, 'exchanges', ex.id);
    if ((await getDoc(exRef)).exists()) {
      console.log(`exchange ${ex.id} already exists, skipping`);
      await signOut(auth).catch(() => {});
      continue;
    }
    const b = BOOKS[ex.book.i];
    await setDoc(doc(db, 'exchanges', ex.id), {
      bookId: bookId(ex.book.tag, ex.book.i),
      bookTitle: b.title,
      bookAuthor: b.author,
      bookCoverImageURL: cover(b.isbn),
      senderId: senderUid,
      receiverId: receiverUid,
      status: ex.status,
      requestedAt: new Date(),
      ...(ex.note ? { note: ex.note } : {}),
    });
    console.log(`exchange ${ex.id}: ${ex.sender} -> ${ex.receiver} (${ex.status})`);
    await signOut(auth).catch(() => {});
  }

  console.log('--- SEED: friend requests ---');
  const friendships = [
    { id: 'qa_fr_1', sender: 'alice', receiver: 'bob', status: 'accepted' },
    { id: 'qa_fr_2', sender: 'carol', receiver: 'david', status: 'pending' },
  ];
  for (const fr of friendships) {
    const senderUid = await signInAs(fr.sender);
    const frRef = doc(db, 'friendRequests', fr.id);
    if ((await getDoc(frRef)).exists()) {
      console.log(`friend request ${fr.id} already exists, skipping`);
      await signOut(auth).catch(() => {});
      continue;
    }
    await setDoc(doc(db, 'friendRequests', fr.id), {
      senderId: senderUid,
      receiverId: byTag[fr.receiver].uid,
      status: fr.status,
      sentAt: serverTimestamp(),
    });
    console.log(`friend request ${fr.id}: ${fr.sender} -> ${fr.receiver} (${fr.status})`);
    await signOut(auth).catch(() => {});
  }

  console.log('--- SEED: chats ---');
  const chats = [
    { a: 'alice', b: 'bob', messages: [
      { from: 'alice', text: 'Hey Bob! Is the Mockingbird still available?' },
      { from: 'bob', text: 'Hi Alice! Yes, you can pick it up this weekend.' },
      { from: 'alice', text: 'Perfect, Saturday morning works for me.' },
    ]},
    { a: 'carol', b: 'alice', messages: [
      { from: 'carol', text: 'Thanks for accepting! When can I grab Dune?' },
      { from: 'alice', text: 'Any evening after 6 works.' },
    ]},
  ];
  for (const c of chats) {
    const uidA = byTag[c.a].uid, uidB = byTag[c.b].uid;
    const cid = chatIdFor(uidA, uidB);
    const participants = [uidA, uidB].sort();
    // Message docs are immutable (rules deny update), so remove any
    // previous QA messages by their known ids before re-seeding.
    // (Old messages lack the participants field, so they can't be listed
    // under the new rules — but they can be deleted via the parent chat.)
    await signInAs(c.a);
    for (let i = 0; i < c.messages.length; i++) {
      const messageId = `qa_msg_${c.a}_${c.b}_${i}`;
      try { await deleteDoc(doc(db, 'chats', cid, 'messages', messageId)); } catch { /* not there */ }
    }
    await signOut(auth).catch(() => {});
    for (let i = 0; i < c.messages.length; i++) {
      const m = c.messages[i];
      const senderUid = await signInAs(m.from);
      const messageId = `qa_msg_${c.a}_${c.b}_${i}`;
      await setDoc(doc(db, 'chats', cid, 'messages', messageId), {
        chatId: cid,
        senderId: senderUid,
        text: m.text,
        timestamp: new Date(Date.now() + i * 1000),
        participants,
      });
      await setDoc(doc(db, 'chats', cid), {
        participants,
        lastMessage: m.text,
        lastMessageTime: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      await signOut(auth).catch(() => {});
    }
    console.log(`chat ${c.a}<->${c.b}: ${c.messages.length} messages`);
  }
  console.log('--- SEED COMPLETE ---');
}

let failures = 0;
function check(name, cond, detail = '') {
  if (cond) console.log(`PASS  ${name}`);
  else { console.log(`FAIL  ${name} ${detail}`); failures++; }
}

async function verify() {
  console.log('--- VERIFY ---');
  // resolve uids via username registry (also tests the registry)
  for (const u of QA_USERS) {
    const snap = await getDoc(doc(db, 'usernames', u.username.toLowerCase()));
    check(`registry lookup ${u.username}`, snap.exists() && snap.data().email === u.email);
    if (snap.exists()) u.uid = snap.data().uid;
  }

  // sign in as alice for authenticated reads
  await signInAs('alice');

  // 1. exchange visibility per user (mirrors onUserExchanges: sender OR receiver)
  const expectedExchanges = { alice: 2, bob: 2, carol: 2, david: 1, eve: 1 };
  for (const u of QA_USERS) {
    const q1 = query(collection(db, 'exchanges'), where('senderId', '==', u.uid));
    const q2 = query(collection(db, 'exchanges'), where('receiverId', '==', u.uid));
    const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
    const ids = new Set([...s1.docs, ...s2.docs].map((d) => d.id));
    check(`exchanges visible to ${u.username}`, ids.size === expectedExchanges[u.tag], `got ${ids.size}, want ${expectedExchanges[u.tag]}`);
  }

  // 2. availability query used by search (collection-wide, status filter).
  // The DB already contains pre-existing exchanges from earlier testing,
  // so assert ours are included rather than an exact total.
  const availSnap = await getDocs(query(collection(db, 'exchanges'), where('status', 'in', ['pending', 'accepted'])));
  const availIds = new Set(availSnap.docs.map((d) => d.id));
  const oursPresent = ['qa_ex_1', 'qa_ex_2', 'qa_ex_3', 'qa_ex_4'].every((id) => availIds.has(id));
  check('availability query includes all 4 QA exchanges', oursPresent, `saw ${availSnap.size} total`);

  // 3. chat lists (mirrors getUserChats)
  const expectedChats = {
    alice: { n: 2, last: 'Any evening after 6 works.' },
    bob: { n: 1, last: 'Perfect, Saturday morning works for me.' },
    carol: { n: 1, last: 'Any evening after 6 works.' },
    david: { n: 0 }, eve: { n: 0 },
  };
  for (const u of QA_USERS) {
    // Sign in as each user: the app always queries with its own uid,
    // and the rule requires the filter value to match the signed-in user.
    await signInAs(u.tag);
    const qs = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', u.uid)));
    const exp = expectedChats[u.tag];
    check(`chat list count for ${u.username}`, qs.size === exp.n, `got ${qs.size}, want ${exp.n}`);
    if (exp.n > 0 && exp.last) {
      const withLast = qs.docs.filter((d) => d.data().lastMessage === exp.last);
      check(`chat lastMessage for ${u.username}`, withLast.length > 0, `missing "${exp.last}"`);
    }
  }

  // 4. chat messages readable by participant
  await signInAs('alice');
  const aliceUid = byTag.alice.uid, bobUid = byTag.bob.uid;
  const cid = chatIdFor(aliceUid, bobUid);
  const msgs = await getDocs(collection(db, 'chats', cid, 'messages'));
  check('alice<->bob has 3 messages', msgs.size === 3, `got ${msgs.size}`);

  // 4b. chat messages NOT readable by non-participant (eve)
  await signInAs('eve');
  let eveDenied = false;
  try {
    await getDocs(collection(db, 'chats', cid, 'messages'));
  } catch (e) {
    eveDenied = e.code === 'permission-denied';
  }
  check('non-participant cannot read chat messages', eveDenied);
  await signInAs('alice');

  // 5. friend requests visible to participants (query as the receiver,
  // like the app does)
  await signInAs('bob');
  const frQ = query(collection(db, 'friendRequests'), where('receiverId', '==', byTag.bob.uid));
  const frSnap = await getDocs(frQ);
  check('bob sees incoming friend request', frSnap.size === 1 && frSnap.docs[0].data().status === 'accepted');

  // 6. books readable
  const booksSnap = await getDocs(collection(db, 'users', aliceUid, 'books'));
  check('alice has 3 books', booksSnap.size === 3, `got ${booksSnap.size}`);

  // 7. profile readable while signed in
  const profSnap = await getDoc(doc(db, 'users', bobUid));
  check('bob profile readable', profSnap.exists() && profSnap.data().fullName === 'QA Bob Martinez');

  await signOut(auth).catch(() => {});
  console.log(failures === 0 ? '--- VERIFY COMPLETE: ALL PASS ---' : `--- VERIFY COMPLETE: ${failures} FAILURES ---`);
  process.exit(failures === 0 ? 0 : 1);
}

async function clean() {
  console.log('--- CLEAN: removing QA data ---');
  // resolve uids first (registry may be the only index)
  for (const u of QA_USERS) {
    try {
      const cred = await signInWithEmailAndPassword(auth, u.email, QA_PASSWORD);
      u.uid = cred.user.uid;
    } catch (e) {
      console.log(`skip ${u.email}: cannot sign in (${e.code})`);
      u.uid = null;
    }
    await signOut(auth).catch(() => {});
  }
  for (const u of QA_USERS) {
    if (!u.uid) continue;
    await signInWithEmailAndPassword(auth, u.email, QA_PASSWORD);
    // books
    const books = await getDocs(collection(db, 'users', u.uid, 'books'));
    for (const d of books.docs) await deleteDoc(d.ref);
    // exchanges where participant
    for (const field of ['senderId', 'receiverId']) {
      const snap = await getDocs(query(collection(db, 'exchanges'), where(field, '==', u.uid)));
      for (const d of snap.docs) { try { await deleteDoc(d.ref); } catch { /* already gone */ } }
    }
    // friend requests where participant
    for (const field of ['senderId', 'receiverId']) {
      const snap = await getDocs(query(collection(db, 'friendRequests'), where(field, '==', u.uid)));
      for (const d of snap.docs) { try { await deleteDoc(d.ref); } catch { /* already gone */ } }
    }
    // chats where participant (messages first, then parent)
    const chats = await getDocs(query(collection(db, 'chats'), where('participants', 'array-contains', u.uid)));
    for (const c of chats.docs) {
      const msgs = await getDocs(collection(db, 'chats', c.id, 'messages'));
      for (const m of msgs.docs) { try { await deleteDoc(m.ref); } catch { /* already gone */ } }
      try { await deleteDoc(c.ref); } catch { /* already gone */ }
    }
    // username registry + profile
    try { await deleteDoc(doc(db, 'usernames', u.username.toLowerCase())); } catch { /* ignore */ }
    try { await deleteDoc(doc(db, 'users', u.uid)); } catch { /* ignore */ }
    // auth account
    try { await deleteUser(auth.currentUser); console.log(`deleted ${u.email}`); }
    catch (e) { console.log(`could not delete auth account ${u.email}: ${e.code}`); }
    await signOut(auth).catch(() => {});
  }
  console.log('--- CLEAN COMPLETE ---');
}

const mode = process.argv[2];
if (mode === 'seed') await seed();
else if (mode === 'verify') await verify();
else if (mode === 'clean') await clean();
else { console.log('usage: node scripts/qa-seed.mjs <seed|verify|clean>'); process.exit(1); }
process.exit(0);
