import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { setDoc, doc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signup: (
    email: string,
    password: string,
    fullName: string,
    username: string,
    zipCode: string,
    birthDate: string,
    city?: string
  ) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  loginByUsername: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

const ZIP_CITY_MAP: Record<string, string> = {
  '10001': 'New York',
  '90210': 'Beverly Hills',
  '33101': 'Miami',
  '60601': 'Chicago',
  '75201': 'Dallas',
  '30301': 'Atlanta',
  '85001': 'Phoenix',
  '19101': 'Philadelphia',
  '77001': 'Houston',
  '94101': 'San Francisco',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  const signup = async (
    email: string,
    password: string,
    fullName: string,
    username: string,
    zipCode: string,
    birthDate: string,
    city?: string
  ) => {
    const detectedCity = city || ZIP_CITY_MAP[zipCode] || 'Unknown';
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, 'users', cred.user.uid), {
      username,
      email,
      fullName,
      birthDate,
      zipCode,
      city: detectedCity,
      profileImageURL: '',
      createdAt: new Date().toISOString(),
    });
  };

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginByUsername = async (username: string, password: string) => {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snap = await getDocs(q);
    if (snap.empty) throw new Error('User not found');

    let email: string | null = null;
    for (const d of snap.docs) {
      const data = d.data();
      if (data.uid && data.uid === d.id) {
        email = data.email as string;
        break;
      }
    }
    if (!email) {
      email = snap.docs[0].data().email as string;
    }
    if (!email) throw new Error('No email found for this account');
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signup,
        login,
        loginByUsername,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
