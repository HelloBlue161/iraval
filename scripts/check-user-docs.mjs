import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'check-user-docs');
const auth = getAuth(app);
const db = getFirestore(app);

// First login as alice
await signInWithEmailAndPassword(auth, 'alice_test@iraval.app', 'Test#12345!');

// Search for alice by username
const aliceQuery = query(collection(db, 'users'), where('username', '==', 'alice'));
const aliceSnap = await getDocs(aliceQuery);

console.log('Searching for username "alice"...');
console.log(`Found ${aliceSnap.docs.length} documents\n`);

for (const doc of aliceSnap.docs) {
  console.log(`Document ID: ${doc.id}`);
  console.log(`Data: ${JSON.stringify(doc.data(), null, 2)}\n`);
}

// Also search by email
const emailQuery = query(collection(db, 'users'), where('email', '==', 'alice_test@iraval.app'));
const emailSnap = await getDocs(emailQuery);

console.log('Searching for email "alice_test@iraval.app"...');
console.log(`Found ${emailSnap.docs.length} documents\n`);

for (const doc of emailSnap.docs) {
  console.log(`Document ID: ${doc.id}`);
  console.log(`Data: ${JSON.stringify(doc.data(), null, 2)}\n`);
}
