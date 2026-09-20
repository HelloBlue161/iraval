import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';
import { useToast } from '../contexts/ToastContext';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const router = useRouter();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toastSuccess('Logged out successfully');
      router.replace('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Logout failed';
      toastError(message);
    }
  };

  const handleClearCache = () => {
    toastInfo('Cache cleared');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Account section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/profile')}
        >
          <Text style={styles.settingIcon}>👤</Text>
          <Text style={styles.settingText}>Edit Profile</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/passwordRecovery')}
        >
          <Text style={styles.settingIcon}>🔑</Text>
          <Text style={styles.settingText}>Change Password</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <View style={styles.settingItem}>
          <Text style={styles.settingIcon}>📧</Text>
          <Text style={styles.settingText}>{user?.email || 'Unknown'}</Text>
        </View>
      </View>

      {/* Preferences section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingIcon}>🔔</Text>
          <Text style={styles.settingText}>Push Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#d1d5db', true: '#fde68a' }}
            thumbColor={notificationsEnabled ? '#f59e0b' : '#f4f4f5'}
          />
        </View>
        <View style={styles.settingItem}>
          <Text style={styles.settingIcon}>🌙</Text>
          <Text style={styles.settingText}>Dark Mode</Text>
          <Switch
            value={darkMode}
            onValueChange={setDarkMode}
            trackColor={{ false: '#d1d5db', true: '#fde68a' }}
            thumbColor={darkMode ? '#f59e0b' : '#f4f4f5'}
          />
        </View>
      </View>

      {/* Support section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/terms')}
        >
          <Text style={styles.settingIcon}>📄</Text>
          <Text style={styles.settingText}>Terms & Conditions</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem}>
          <Text style={styles.settingIcon}>💬</Text>
          <Text style={styles.settingText}>Contact Support</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.settingItem} onPress={handleClearCache}>
          <Text style={styles.settingIcon}>🗑️</Text>
          <Text style={styles.settingText}>Clear Cache</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* App info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.settingItem}>
          <Text style={styles.settingText}>Version 1.0.0</Text>
        </View>
        <Text style={styles.appName}>Iraval</Text>
        <Text style={styles.appTagline}>Your book exchange community</Text>
      </View>

      {/* Logout */}
      <View style={styles.logoutSection}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={() => setShowConfirmLogout(true)}
        >
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Logout confirmation modal */}
      {showConfirmLogout && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Logout</Text>
            <Text style={styles.modalMessage}>Are you sure you want to logout?</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancel]}
                onPress={() => setShowConfirmLogout(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalLogout]}
                onPress={handleLogout}
              >
                <Text style={styles.modalLogoutText}>Logout</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  section: { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#fde68a', overflow: 'hidden' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, padding: 16, paddingBottom: 4 },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingIcon: { fontSize: 20, marginRight: 12, width: 28, textAlign: 'center' },
  settingText: { flex: 1, fontSize: 16, color: '#1c1917' },
  chevron: { fontSize: 22, color: '#a8a29e' },
  appName: { fontSize: 24, fontWeight: 'bold', color: '#92400e', fontFamily: 'serif', textAlign: 'center', marginTop: 12 },
  appTagline: { fontSize: 13, color: '#78716c', textAlign: 'center', marginBottom: 20 },
  logoutSection: { padding: 20, paddingTop: 12 },
  logoutButton: { backgroundColor: '#dc2626', padding: 16, borderRadius: 12, alignItems: 'center' },
  logoutButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '80%', maxWidth: 320 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#92400e', marginBottom: 8, textAlign: 'center' },
  modalMessage: { fontSize: 15, color: '#44403c', textAlign: 'center', marginBottom: 20 },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 10, alignItems: 'center' },
  modalCancel: { backgroundColor: '#e5e7eb' },
  modalCancelText: { color: '#374151', fontSize: 16, fontWeight: '600' },
  modalLogout: { backgroundColor: '#dc2626' },
  modalLogoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
