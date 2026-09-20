import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const firebaseApp = initializeApp(firebaseConfig, 'create-user-docs');

const usersData = [
  {
    uid: 'LHzKZP3Xd8c8sgKps28CnLzoLuG3',
    email: 'alice_test@iraval.app',
    password: 'Test#12345!',
    username: 'alice',
    fullName: 'Alice Chen',
    birthDate: '1990-05-15',
    zipCode: '10001',
    city: 'New York',
    books: [
      { bookId: 'book_alice_1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', language: 'English' },
      { bookId: 'book_alice_2', title: '1984', author: 'George Orwell', language: 'English' },
      { bookId: 'book_alice_3', title: 'To Kill a Mockingbird', author: 'Harper Lee', language: 'English' },
    ],
  },
  {
    uid: 'z9QL6X4yHpM9zfKlKcgLfQDf7qL2',
    email: 'bob_test@iraval.app',
    password: 'Test#12345!',
    username: 'bob',
    fullName: 'Bob Martinez',
    birthDate: '1988-11-22',
    zipCode: '90210',
    city: 'Beverly Hills',
    books: [
      { bookId: 'book_bob_1', title: 'Dune', author: 'Frank Herbert', language: 'English' },
      { bookId: 'book_bob_2', title: 'Clean Code', author: 'Robert C. Martin', language: 'English' },
      { bookId: 'book_bob_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English' },
    ],
  },
  {
    uid: 'nlTRYSyUfYhTGD7OBurZpd1YGZW2',
    email: 'carol_test@iraval.app',
    password: 'Test#12345!',
    username: 'carol',
    fullName: 'Carol Johnson',
    birthDate: '1992-03-08',
    zipCode: '60601',
    city: 'Chicago',
    books: [
      { bookId: 'book_carol_1', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English' },
      { bookId: 'book_carol_2', title: 'Pride and Prejudice', author: 'Jane Austen', language: 'English' },
    ],
  },
];

console.log('Creating user documents...\n');

for (const userData of usersData) {
  try {
    // Create a new auth instance for each user
    const auth = getAuth(firebaseApp);
    const db = getFirestore(firebaseApp);
    
    // Login as this user
    await signInWithEmailAndPassword(auth, userData.email, userData.password);
    
    // Create user document
    await setDoc(doc(db, 'users', userData.uid), {
      uid: userData.uid,
      email: userData.email,
      username: userData.username,
      fullName: userData.fullName,
      birthDate: userData.birthDate,
      zipCode: userData.zipCode,
      city: userData.city,
      createdAt: new Date().toISOString(),
    });
    console.log(`✓ Created user: ${userData.username} (${userData.email})`);

    // Create books for user
    for (const book of userData.books) {
      await setDoc(doc(db, 'users', userData.uid, 'books', book.bookId), {
        bookId: book.bookId,
        title: book.title,
        author: book.author,
        language: book.language,
        addedBy: userData.uid,
        createdAt: new Date().toISOString(),
      });
    }
    console.log(`  Created ${userData.books.length} books\n`);
  } catch (err) {
    console.log(`✗ Failed: ${userData.email} - ${err.message}\n`);
  }
}

console.log('Done!');
