import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'check-exchange');
const auth = getAuth(app);
const db = getFirestore(app);

await signInWithEmailAndPassword(auth, 'alice_test@iraval.app', 'Test#12345!');

console.log('\nChecking exchanges...\n');

// Get all exchanges
const exchangesSnap = await getDocs(collection(db, 'exchanges'));
console.log(`Total exchanges: ${exchangesSnap.docs.length}\n`);

for (const doc of exchangesSnap.docs) {
  const data = doc.data();
  console.log(`Exchange: ${doc.id}`);
  console.log(`  Book: ${data.bookTitle} (bookId: ${data.bookId})`);
  console.log(`  Sender: ${data.senderId}`);
  console.log(`  Receiver: ${data.receiverId}`);
  console.log(`  Status: ${data.status}`);
  console.log('');
}

// Test the isBookUnavailable query
console.log('Testing isBookUnavailable query...\n');
const bookId = 'book_alice_2'; // 1984
const userId = 'LHzKZP3Xd8c8sgKps28CnLzoLuG3'; // Alice

const q1 = query(
  collection(db, 'exchanges'),
  where('bookId', '==', bookId),
  where('status', 'in', ['pending', 'accepted']),
  where('senderId', '==', userId)
);
const q2 = query(
  collection(db, 'exchanges'),
  where('bookId', '==', bookId),
  where('status', 'in', ['pending', 'accepted']),
  where('receiverId', '==', userId)
);

const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
console.log(`Query 1 (sender): ${snap1.docs.length} results`);
console.log(`Query 2 (receiver): ${snap2.docs.length} results`);
console.log(`Result: ${!snap1.empty || !snap2.empty ? 'UNAVAILABLE' : 'AVAILABLE'}`);
