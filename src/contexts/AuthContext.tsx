import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { setDoc, doc, query, collection, where, getDocs } from 'firebase/firestore';
import {
  sendRecoveryCode as sendRecoveryCodeApi,
  verifyRecoveryCode as verifyRecoveryCodeApi,
  resetPassword as resetPasswordApi,
} from '../services/passwordRecovery';

interface AuthContextType {
  user: FirebaseUser | null;
  loading: boolean;
  signupFn: (
    email: string,
    password: string,
    fullName: string,
    username: string,
    zipCode: string,
    birthDate: string,
    city?: string
  ) => Promise<void>;
  loginFn: (email: string, password: string) => Promise<void>;
  loginByUsername: (username: string, password: string) => Promise<void>;
  logoutFn: () => Promise<void>;
  sendRecoveryCode: (email: string) => Promise<{ success: boolean; message: string }>;
  verifyRecoveryCode: (email: string, code: string) => Promise<{ success: boolean; message: string }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
      if (u) {
        console.log('[Auth] Current user Auth UID:', u.uid, 'email:', u.email);
      }
    });
    return unsubscribe;
  }, []);

  const signupFn = async (
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
      uid: cred.user.uid,
      username,
      email,
      fullName,
      birthDate,
      zipCode,
      city: detectedCity,
      profileImageURL: '',
      createdAt: new Date().toISOString(),
    });
    console.log('User document written successfully');
  };

  const loginFn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginByUsername = async (username: string, password: string) => {
    const q = query(collection(db, 'users'), where('username', '==', username));
    const snap = await getDocs(q);

    // Debug: log what was found
    console.log('loginByUsername:', username, 'found', snap.docs.length, 'docs');
    snap.docs.forEach((d) => console.log('  doc', d.id, '→', JSON.stringify(d.data())));

    if (snap.empty) throw new Error('User not found');

    // Prefer the document whose ID matches its uid field (the correct format
    // from seed scripts). Fall back to first match for legacy docs.
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

  const logoutFn = async () => {
    await signOut(auth);
  };

  const sendRecoveryCode = async (email: string) => {
    return sendRecoveryCodeApi(email);
  };

  const verifyRecoveryCode = async (email: string, code: string) => {
    return verifyRecoveryCodeApi(email, code);
  };

  const resetPassword = async (email: string, newPassword: string) => {
    return resetPasswordApi(email, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signupFn,
        loginFn,
        loginByUsername,
        logoutFn,
        sendRecoveryCode,
        verifyRecoveryCode,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
