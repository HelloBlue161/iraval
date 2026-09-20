import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig, 'test-password-recovery');
const auth = getAuth(app);
const db = getFirestore(app);

console.log('\n========================================');
console.log('  Testing Password Recovery');
console.log('========================================\n');

// Step 1: Login as Alice
console.log('Step 1: Login as Alice...');
try {
  await signInWithEmailAndPassword(auth, 'alice_test@iraval.app', 'Test#12345!');
  console.log('  ✓ Logged in as Alice\n');
} catch (err) {
  console.log(`  ✗ Login failed: ${err.message}\n`);
  process.exit(1);
}

// Step 2: Generate a recovery code
console.log('Step 2: Generate recovery code...');
try {
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
  
  await setDoc(doc(db, 'recoveryCodes', `alice_${Date.now()}`), {
    email: 'alice_test@iraval.app',
    code: code,
    expiresAt: expiresAt,
    createdAt: new Date().toISOString(),
    used: false,
  });
  
  console.log(`  ✓ Recovery code generated: ${code}`);
  console.log(`  Code expires: ${expiresAt}\n`);
  
  // Step 3: Verify the code exists
  console.log('Step 3: Verify code in Firestore...');
  const codesSnap = await getDocs(
    query(collection(db, 'recoveryCodes'), where('email', '==', 'alice_test@iraval.app'))
  );
  
  if (codesSnap.docs.length > 0) {
    const codeData = codesSnap.docs[0].data();
    console.log(`  ✓ Code found in Firestore: ${codeData.code}`);
    console.log(`  Status: ${codeData.used ? 'Used' : 'Active'}`);
    console.log(`  Expires: ${codeData.expiresAt}\n`);
    
    // Step 4: Test code verification logic
    console.log('Step 4: Test code verification...');
    if (codeData.code === code && !codeData.used) {
      console.log('  ✓ Code verification would succeed\n');
    } else {
      console.log('  ✗ Code verification would fail\n');
    }
  } else {
    console.log('  ✗ No recovery codes found\n');
  }
  
} catch (err) {
  console.log(`  ✗ Recovery code generation failed: ${err.message}\n`);
}

// Step 5: Check password recovery flow in app
console.log('Step 5: Check app password recovery flow...');
try {
  const loginPage = await fetch('https://iraval.netlify.app/login');
  const loginHtml = await loginPage.text();
  
  if (loginHtml.includes('forgot-password')) {
    console.log('  ✓ "Forgot Password" link found on login page');
  } else {
    console.log('  ✗ "Forgot Password" link NOT found');
  }
  
  // Check if password recovery page exists
  const recoveryPage = await fetch('https://iraval.netlify.app/forgot-password');
  if (recoveryPage.status === 200) {
    console.log('  ✓ Password recovery page exists');
  } else {
    console.log(`  ✗ Password recovery page not found (status: ${recoveryPage.status})`);
  }
  
} catch (err) {
  console.log(`  ✗ App check failed: ${err.message}\n`);
}

console.log('\n========================================');
console.log('  Password Recovery Test Complete');
console.log('========================================\n');

console.log('To test the full flow:');
console.log('1. Open https://iraval.netlify.app/login');
console.log('2. Click "Forgot Password?"');
console.log('3. Enter your email');
console.log('4. Enter the recovery code');
console.log('5. Set a new password\n');
