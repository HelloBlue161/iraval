import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'test-browse');
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, 'alice_test@iraval.app', 'Test#12345!');

console.log('\nTesting browse mode...\n');

// Get all users
const usersSnap = await getDocs(collection(db, 'users'));
console.log(`Total users: ${usersSnap.docs.length}\n`);

// Get all books
let totalBooks = 0;
for (const userDoc of usersSnap.docs) {
  const booksSnap = await getDocs(collection(db, 'users', userDoc.id, 'books'));
  totalBooks += booksSnap.docs.length;
  console.log(`${userDoc.data().fullName}: ${booksSnap.docs.length} books`);
}

console.log(`\nTotal books: ${totalBooks}`);
console.log('\nBrowse mode should show all these books when search is empty.');
