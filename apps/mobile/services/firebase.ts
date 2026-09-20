import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: 'AIzaSyDsXJbZ7ksX9UWHpLIU7RBLfGOjsSYb2EA',
  projectId: 'iraval-7733e',
  storageBucket: 'iraval-7733e.firebasestorage.app',
  messagingSenderId: '249098433505',
  appId: '1:249098433505:web:694f1a92d7c16eff8758a0',
};

const app = initializeApp(firebaseConfig);

// Use in-memory persistence (auth state is preserved during the app session)
// For full persistence across restarts, use getReactNativePersistence from firebase/auth/rn
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Make AsyncStorage available for manual use
export { AsyncStorage };
