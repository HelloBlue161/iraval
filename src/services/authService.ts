import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
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

  // Public username registry so signup/login can check username availability
  // and resolve login emails without reading the (auth-protected) users collection.
  // Keyed by lowercase username for case-insensitive uniqueness.
  await setDoc(doc(db, 'usernames', username.trim().toLowerCase()), {
    uid,
    email,
  });

  return userCredential.user;
}

export async function login(email: string, password: string): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUsernameRegistry(userCredential.user.uid);
  return userCredential.user;
}

export async function logout(): Promise<void> {
  await signOut(auth);
}

export async function findUserEmailByUsername(username: string): Promise<string | null> {
  // Public username registry (no auth needed): maps lowercase username -> { uid, email }.
  // The users collection itself requires authentication to read.
  const snap = await getDoc(doc(db, 'usernames', username.trim().toLowerCase()));
  if (!snap.exists()) return null;
  return snap.data().email || null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const snap = await getDoc(doc(db, 'usernames', username.trim().toLowerCase()));
  return snap.exists();
}

/**
 * Backfill the public username registry for accounts created before the
 * registry existed. Safe to call on every login: it only writes when the
 * entry is missing.
 */
export async function ensureUsernameRegistry(uid: string): Promise<void> {
  try {
    const userSnap = await getDoc(doc(db, 'users', uid));
    if (!userSnap.exists()) return;
    const data = userSnap.data();
    const username = String(data.username || '').trim().toLowerCase();
    if (!username) return;
    const regRef = doc(db, 'usernames', username);
    const regSnap = await getDoc(regRef);
    if (regSnap.exists()) return;
    await setDoc(regRef, { uid, email: data.email || auth.currentUser?.email || '' });
  } catch {
    // Registry is best-effort; never block login on it.
  }
}

export function getCurrentEmail(): string | null {
  return auth.currentUser?.email || null;
}

export function getCurrentUid(): string | null {
  return auth.currentUser?.uid || null;
}
