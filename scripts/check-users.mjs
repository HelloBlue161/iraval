import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'check-users');
const auth = getAuth(app);

const testUsers = [
  { email: 'alice_test@iraval.app', password: 'Test#12345!' },
  { email: 'bob_test@iraval.app', password: 'Test#12345!' },
  { email: 'carol_test@iraval.app', password: 'Test#12345!' },
  { email: 'david_test@iraval.app', password: 'Test#12345!' },
  { email: 'eve_test@iraval.app', password: 'Test#12345!' },
  { email: 'frank_test@iraval.app', password: 'Test#12345!' },
];

console.log('Creating test users...\n');

for (const user of testUsers) {
  try {
    // Try to login first
    const result = await signInWithEmailAndPassword(auth, user.email, user.password);
    console.log(`✓ ${user.email} - Already exists (UID: ${result.user.uid})`);
  } catch (err) {
    if (err.code === 'auth/user-not-found') {
      try {
        // Create the user
        const result = await createUserWithEmailAndPassword(auth, user.email, user.password);
        console.log(`✓ ${user.email} - Created (UID: ${result.user.uid})`);
      } catch (createErr) {
        console.log(`✗ ${user.email} - Create failed: ${createErr.message}`);
      }
    } else if (err.code === 'auth/invalid-credential') {
      console.log(`✗ ${user.email} - Wrong password (exists but password doesn't match)`);
    } else {
      console.log(`✗ ${user.email} - Error: ${err.message}`);
    }
  }
}

console.log('\nDone!');
