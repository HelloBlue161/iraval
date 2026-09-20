import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, query, collection, where, getDocs } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';

export async function signup(
  email: string,
  password: string,
  fullName: string,
  username: string,
  zipCode: string,
  birthDate: string,
  city: string
): Promise<FirebaseUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const uid = userCredential.user.uid;

  await setDoc(doc(db, 'users', uid), {
    username,
    email,
    fullName,
    birthDate,
    zipCode,
    city,
    profileImageURL: '',
    createdAt: new Date().toISOString(),
  });

  return userCredential.user;
}

export async function login(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function findUserEmailByUsername(username: string): Promise<string | null> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].data().email || null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const q = query(collection(db, 'users'), where('username', '==', username));
  const snap = await getDocs(q);
  return !snap.empty;
}

export function getCurrentEmail(): string | null {
  return auth.currentUser?.email || null;
}

export function getCurrentUid(): string | null {
  return auth.currentUser?.uid || null;
}
