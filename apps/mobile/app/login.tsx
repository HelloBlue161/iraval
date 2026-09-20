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
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { loginByUsername } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!username || !password) {
      setError('Please enter your username and password');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await loginByUsername(username, password);
      router.replace('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Login failed';
      if (message.includes('user-not-found') || message.includes('User not found')) {
        setError('Username not found. Please check or create an account.');
      } else if (message.includes('invalid-credential') || message.includes('wrong-password')) {
        setError('Incorrect password. Please try again.');
      } else if (message.includes('too-many-requests') || message.includes('rate')) {
        setError('Too many login attempts. Please wait a moment and try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const openPasswordRecovery = async () => {
    try {
      await Linking.openURL('https://iraval.app/terms');
    } catch {
      // Fallback
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.title}>Welcome to Iraval</Text>
          <Text style={styles.subtitle}>Your book exchange community</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your username"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              accessibilityLabel="Username"
              returnKeyType="next"
              onSubmitEditing={() => {
                // Focus password field
              }}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              accessibilityLabel="Password"
              returnKeyType="done"
              onSubmitEditing={handleSubmit}
            />
          </View>

          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => router.push('/passwordRecovery')}
          >
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </TouchableOpacity>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Sign In'}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.link} onPress={() => router.push('/signup')}>
            <Text style={styles.linkText}>Don't have an account? Sign Up</Text>
          </TouchableOpacity>

          <View style={styles.termsRow}>
            <Text style={styles.termsText}>By signing in, you agree to our</Text>
            <TouchableOpacity onPress={() => router.push('/terms')}>
              <Text style={styles.termsLink}>Terms & Conditions</Text>
            </TouchableOpacity>
          </View>
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
    fontFamily: 'serif',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#78716c',
    marginBottom: 24,
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
  forgotLink: { alignSelf: 'flex-end', marginBottom: 12 },
  forgotLinkText: { color: '#d97706', fontSize: 14 },
  button: {
    backgroundColor: '#f59e0b',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  error: {
    color: '#dc2626',
    fontSize: 14,
    backgroundColor: '#fef2f2',
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  link: { alignItems: 'center', marginTop: 16 },
  linkText: { color: '#d97706', fontSize: 14 },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
    flexWrap: 'wrap',
  },
  termsText: { fontSize: 12, color: '#a8a29e' },
  termsLink: { fontSize: 12, color: '#d97706', textDecorationLine: 'underline' },
});
