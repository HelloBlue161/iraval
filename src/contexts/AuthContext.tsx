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
  sendEmailVerification,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '../services/firebase';
import { setDoc, doc } from 'firebase/firestore';
import { sendPasswordReset as sendPasswordResetApi } from '../services/passwordRecovery';
import { findUserEmailByUsername, ensureUsernameRegistry } from '../services/authService';

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
  ) => Promise<{ needsVerification?: boolean }>;
  needsEmailVerification: boolean;
  setNeedsEmailVerification: (needs: boolean) => void;
  loginFn: (email: string, password: string) => Promise<void>;
  loginByUsername: (username: string, password: string) => Promise<void>;
  logoutFn: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<{ success: boolean; message: string }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function useAuthState() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthState must be used within AuthProvider');
  return { user: ctx.user, loading: ctx.loading, needsEmailVerification: ctx.needsEmailVerification };
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
  const [needsEmailVerification, setNeedsEmailVerification] = useState(false);

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
    });
    console.log('User document written successfully');
    
    // Send email verification
    await sendEmailVerification(cred.user);
    
    return { needsVerification: true };
  };

  const loginFn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const loginByUsername = async (username: string, password: string) => {
    const email = await findUserEmailByUsername(username);
    if (!email) throw new Error('User not found');
    const cred = await signInWithEmailAndPassword(auth, email, password);
    await ensureUsernameRegistry(cred.user.uid);
  };

  const logoutFn = async () => {
    await signOut(auth);
  };

  const sendPasswordReset = async (email: string) => {
    return sendPasswordResetApi(email);
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
        sendPasswordReset,
        needsEmailVerification,
        setNeedsEmailVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
