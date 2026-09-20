/**
 * Seed Test Data for Iraval Mobile App Testing
 * 
 * Creates dummy users with books for comprehensive testing
 * Run: node scripts/seed-test-data.js
 * 
 * This creates:
 * - 6 test users with different cities/zip codes
 * - Each user has 3-5 books
 * - Test friend requests and exchanges
 * - Test chat messages
 * 
 * All passwords: Test#12345
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// For Firebase Admin, you need service account credentials
// For now, this is a template that shows the data structure

const TEST_USERS = [
  {
    email: 'test_alice@iraval.app',
    username: 'alice_nyc',
    fullName: 'Alice Chen',
    password: 'Test#12345',
    birthDate: '1990-05-15',
    zipCode: '10001',
    city: 'New York',
    books: [
      { bookId: 'book_alice_1', title: 'The Great Gatsby', author: 'F. Scott Fitzgerald', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0743273567.01.MZ.V1.jpg' },
      { bookId: 'book_alice_2', title: '1984', author: 'George Orwell', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0451524934.01.MZ.V1.jpg' },
      { bookId: 'book_alice_3', title: 'To Kill a Mockingbird', author: 'Harper Lee', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0061120081.01.MZ.V1.jpg' },
    ],
  },
  {
    email: 'test_bob@iraval.app',
    username: 'bob_la',
    fullName: 'Bob Martinez',
    password: 'Test#12345',
    birthDate: '1988-11-22',
    zipCode: '90210',
    city: 'Beverly Hills',
    books: [
      { bookId: 'book_bob_1', title: 'Dune', author: 'Frank Herbert', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0441013388.01.MZ.V1.jpg' },
      { bookId: 'book_bob_2', title: 'Clean Code', author: 'Robert C. Martin', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0132350886.01.MZ.V1.jpg' },
      { bookId: 'book_bob_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/1590302257.01.MZ.V1.jpg' },
    ],
  },
  {
    email: 'test_carol@iraval.app',
    username: 'carol_chi',
    fullName: 'Carol Johnson',
    password: 'Test#12345',
    birthDate: '1992-03-08',
    zipCode: '60601',
    city: 'Chicago',
    books: [
      { bookId: 'book_carol_1', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0062316095.01.MZ.V1.jpg' },
      { bookId: 'book_carol_2', title: 'Pride and Prejudice', author: 'Jane Austen', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0141439513.01.MZ.V1.jpg' },
    ],
  },
  {
    email: 'test_david@iraval.app',
    username: 'david_miami',
    fullName: 'David Patel',
    password: 'Test#12345',
    birthDate: '1995-07-30',
    zipCode: '33101',
    city: 'Miami',
    books: [
      { bookId: 'book_david_1', title: 'Atomic Habits', author: 'James Clear', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0735211299.01.MZ.V1.jpg' },
      { bookId: 'book_david_2', title: 'The Alchemist', author: 'Paulo Coelho', language: 'Portuguese', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0062315005.01.MZ.V1.jpg' },
      { bookId: 'book_david_3', title: 'நீதி நெறி', author: 'Thiruvalluvar', language: 'Tamil', coverImageURL: '' },
    ],
  },
  {
    email: 'test_eve@iraval.app',
    username: 'eve_sf',
    fullName: 'Eve Nakamura',
    password: 'Test#12345',
    birthDate: '1993-01-12',
    zipCode: '94101',
    city: 'San Francisco',
    books: [
      { bookId: 'book_eve_1', title: 'Meditations', author: 'Marcus Aurelius', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0140449337.01.MZ.V1.jpg' },
      { bookId: 'book_eve_2', title: 'The Lean Startup', author: 'Eric Ries', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0307887898.01.MZ.V1.jpg' },
      { bookId: 'book_eve_3', title: 'கலவியல்', author: 'Bharathiar', language: 'Tamil', coverImageURL: '' },
    ],
  },
  {
    email: 'test_frank@iraval.app',
    username: 'frank_dallas',
    fullName: 'Frank Okafor',
    password: 'Test#12345',
    birthDate: '1987-09-25',
    zipCode: '75201',
    city: 'Dallas',
    books: [
      { bookId: 'book_frank_1', title: 'The Hobbit', author: 'J.R.R. Tolkien', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/054792822X.01.MZ.V1.jpg' },
      { bookId: 'book_frank_2', title: 'Brave New World', author: 'Aldous Huxley', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0060850526.01.MZ.V1.jpg' },
      { bookId: 'book_frank_3', title: 'The Art of War', author: 'Sun Tzu', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/1590302257.01.MZ.V1.jpg' },
      { bookId: 'book_frank_4', title: 'Sapiens', author: 'Yuval Noah Harari', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0062316095.01.MZ.V1.jpg' },
      { bookId: 'book_frank_5', title: 'Thinking, Fast and Slow', author: 'Daniel Kahneman', language: 'English', coverImageURL: 'https://images-na.ssl-images-amazon.com/images/P/0374533555.01.MZ.V1.jpg' },
    ],
  },
];

// Test scenarios to set up after user creation
const TEST_SCENARIOS = {
  // Friend requests: Alice -> Bob (pending), Bob -> Carol (accepted)
  friendRequests: [
    { senderId: 'user_alice', receiverId: 'user_bob', status: 'pending' },
    { senderId: 'user_bob', receiverId: 'user_carol', status: 'accepted' },
    { senderId: 'user_carol', receiverId: 'user_bob', status: 'accepted' },
  ],
  // Exchanges: David -> Alice (pending), Carol -> Bob (accepted)
  exchanges: [
    {
      bookId: 'book_alice_2',
      bookTitle: '1984',
      bookAuthor: 'George Orwell',
      senderId: 'user_david',
      receiverId: 'user_alice',
      status: 'pending',
      note: 'I would love to read this classic!',
    },
    {
      bookId: 'book_carol_1',
      bookTitle: 'Sapiens',
      bookAuthor: 'Yuval Noah Harari',
      senderId: 'user_carol',
      receiverId: 'user_bob',
      status: 'accepted',
      note: 'Great book exchange!',
    },
  ],
  // Chat messages between Alice and David
  chatMessages: [
    {
      senderId: 'user_alice',
      text: 'Hi David! I accepted your request for 1984.',
    },
    {
      senderId: 'user_david',
      text: 'Great! I\'m in Miami. How about we meet at a coffee shop next week?',
    },
    {
      senderId: 'user_alice',
      text: 'Sounds good! Let me know the exact location.',
    },
  ],
};

console.log(`
========================================
  Iraval Test Data Seeder
========================================

This script will create the following test data:

  Users:     ${TEST_USERS.length} test accounts
  Books:     Total of ${TEST_USERS.reduce((sum, u) => sum + u.books.length, 0)} books
  Cities:    ${TEST_USERS.map(u => u.city).join(', ')}
  Languages: English, Tamil, Portuguese

  Password for all users: Test#12345

Test Scenarios:
  - Friend requests (pending + accepted)
  - Exchange requests (pending + accepted)
  - Chat messages between users

========================================
`);

// Instructions for running
console.log('To seed this data to your Firebase project:');
console.log('');
console.log('1. Install Firebase Admin SDK:');
console.log('   npm install firebase-admin');
console.log('');
console.log('2. Set up service account credentials:');
console.log('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"');
console.log('');
console.log('3. Run the seeder:');
console.log('   node scripts/seed-test-data.js --seed');
console.log('');
console.log('--- OR ---');
console.log('');
console.log('Use the Firebase Console to create users manually with these details:');
console.log(JSON.stringify(TEST_USERS.map(u => ({ email: u.email, username: u.username, fullName: u.fullName, city: u.city, bookCount: u.books.length })), null, 2));
console.log('');
console.log('Book inventory per user:');
TEST_USERS.forEach(u => {
  console.log(`\n  ${u.fullName} (@${u.username}) - ${u.city}`);
  u.books.forEach(b => {
    const lang = b.language ? ` [${b.language}]` : '';
    console.log(`    - ${b.title} by ${b.author}${lang}`);
  });
});
