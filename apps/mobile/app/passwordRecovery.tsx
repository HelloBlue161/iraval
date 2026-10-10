import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../services/firebase';
import { useToast } from '../contexts/ToastContext';

/**
 * Password recovery, rebuilt on Firebase's native reset flow (same as web):
 * one step - enter email, receive a secure link, set the new password on
 * Firebase's hosted page. The old 6-digit-code screens were removed - the
 * reset email contains a link, not a code.
 */
export default function PasswordRecoveryScreen() {
  const router = useRouter();
  const { success: toastSuccess, error: toastError } = useToast();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendLink = async () => {
    const normalized = email.trim().toLowerCase();
    if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      setError('Please enter a valid email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, normalized);
      setSent(true);
      toastSuccess('Reset link sent! Check your inbox (and spam folder).');
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code ?? '';
      // Don't reveal whether the address is registered (mirrors the web flow)
      if (code === 'auth/user-not-found') {
        setSent(true);
        toastSuccess('If an account exists for that email, a reset link is on its way.');
        return;
      }
      const message =
        code === 'auth/too-many-requests'
          ? 'Too many attempts. Please wait a few minutes and try again.'
          : 'Could not send the reset email. Please check the address and try again.';
      setError(message);
      toastError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Reset Password</Text>

          {sent ? (
            <>
              <Text style={styles.subtitle}>
                A password reset link has been sent to {email.trim().toLowerCase()}.
                Open it and choose a new password, then come back and log in.
              </Text>
              <TouchableOpacity
                style={styles.button}
                onPress={() => router.replace('/login')}
              >
                <Text style={styles.buttonText}>Back to Login</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.link}
                onPress={() => { setSent(false); setError(''); }}
              >
                <Text style={styles.linkText}>Use a different email</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.subtitle}>
                Enter your account email and we&apos;ll send you a link to reset your password.
              </Text>
              <View style={styles.field}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                />
              </View>
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendLink}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.link} onPress={() => router.back()}>
            <Text style={styles.linkText}>← Back to login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 8,
    fontFamily: 'serif',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 20,
    textAlign: 'center',
  },
  field: { marginBottom: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#e7e5e4',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
  },
  button: {
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  error: {
    color: '#dc2626',
    fontSize: 14,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  link: { alignItems: 'center', marginTop: 12 },
  linkText: { color: '#d97706', fontSize: 14 },
});
