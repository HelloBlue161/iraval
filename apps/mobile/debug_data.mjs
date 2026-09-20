// Debug script - check what's actually in Firestore
import { initializeApp } from '@firebase/app';
import { getAuth, signInWithEmailAndPassword } from '@firebase/auth';
import { getFirestore, collection, getDocs, doc, getDoc } from '@firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'debug');
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
  // Sign in as alice
  await signInWithEmailAndPassword(auth, 'mob_test1@iraval.test', 'Test#12345');
  await new Promise(r => setTimeout(r, 300));

  // Check all user profiles
  console.log('=== User Profiles ===');
  const usersSnap = await getDocs(collection(db, 'users'));
  console.log(`Total user docs: ${usersSnap.docs.length}`);

  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    const uid = docSnap.id;
    const hasUidField = data?.uid;
    const isPrimary = !hasUidField || data.uid === uid;
    console.log(`  UID: ${uid}`);
    console.log(`    username: ${data.username}`);
    console.log(`    email: ${data.email}`);
    console.log(`    fullName: ${data.fullName}`);
    console.log(`    zipCode: ${data.zipCode}`);
    console.log(`    city: ${data.city}`);
    console.log(`    uid field: ${hasUidField || '(none - primary doc)'}`);
    console.log(`    isPrimary: ${isPrimary}`);
    console.log();
  }

  // Check books for each primary user
  console.log('=== Books by Primary Users ===');
  for (const docSnap of usersSnap.docs) {
    const data = docSnap.data();
    if (data?.uid && data.uid !== docSnap.id) continue; // Skip non-primary

    const booksSnap = await getDocs(collection(db, 'users', docSnap.id, 'books'));
    console.log(`  ${data.fullName} (${docSnap.id}):`);
    for (const b of booksSnap.docs) {
      const bd = b.data();
      console.log(`    - "${bd.title}" by ${bd.author} (lang: ${bd.language})`);
    }
  }

  // Check Dune results
  console.log('\n=== Dune Search Results ===');
  const allBooks = await getDocs(collection(db, 'users'));
  for (const u of allBooks.docs) {
    const uData = u.data();
    if (uData?.uid && uData.uid !== u.id) continue;
    const books = await getDocs(collection(db, 'users', u.id, 'books'));
    for (const b of books.docs) {
      const bd = b.data();
      if (bd.title.toLowerCase().includes('dune')) {
        console.log(`  "${bd.title}" by ${bd.author} - added by ${uData.fullName || 'unknown'} (${u.id})`);
      }
    }
  }
}

main().catch(console.error);
