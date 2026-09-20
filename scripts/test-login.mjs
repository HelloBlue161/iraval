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

const app = initializeApp(firebaseConfig, 'test-login');
const auth = getAuth(app);
const db = getFirestore(app);

// Test login flow (same as the app does)
async function testLogin(username, password) {
  console.log(`\nTesting login: ${username}`);
  
  try {
    // Step 1: Search for user by username (same as LoginView.tsx)
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snap = await getDocs(q);
    
    console.log(`  Found ${snap.docs.length} documents`);
    
    if (snap.empty) {
      console.log(`  ✗ User not found`);
      return false;
    }
    
    // Step 2: Get email from user document
    let email = null;
    for (const d of snap.docs) {
      const data = d.data();
      if (data.uid && data.uid === d.id) {
        email = data.email;
        break;
      }
    }
    
    if (!email) {
      console.log(`  ✗ No valid email found`);
      return false;
    }
    
    console.log(`  Email: ${email}`);
    
    // Step 3: Login with email/password
    const result = await signInWithEmailAndPassword(auth, email, password);
    console.log(`  ✓ Login successful!`);
    console.log(`  UID: ${result.user.uid}`);
    return true;
    
  } catch (err) {
    console.log(`  ✗ Login failed: ${err.message}`);
    return false;
  }
}

// Test all users
const tests = [
  { username: 'alice', password: 'Test#12345!' },
  { username: 'bob', password: 'Test#12345!' },
  { username: 'carol', password: 'Test#12345!' },
];

let passed = 0;
let failed = 0;

for (const test of tests) {
  const result = await testLogin(test.username, test.password);
  if (result) {
    passed++;
  } else {
    failed++;
  }
}

console.log(`\n${'='.repeat(40)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'='.repeat(40)}\n`);
