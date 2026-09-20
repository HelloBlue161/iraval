import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { getUserProfile, getUserById } from '@iraval/shared';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

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

export default function ProfileScreen() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [profile, setProfile] = useState<{
    fullName?: string;
    email?: string;
    username?: string;
    city?: string;
    zipCode?: string;
    birthDate?: string;
    profileImageURL?: string;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [editCity, setEditCity] = useState('');
  const [editZip, setEditZip] = useState('');
  const [loading, setLoading] = useState(true);
  const [nearbyUsers, setNearbyUsers] = useState<any[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => {
      setProfile(p);
      setEditCity(p?.city || '');
      setEditZip(p?.zipCode || '');
      setLoading(false);
    });
  }, [user?.uid]);

  const handleSave = async () => {
    if (!user) return;
    try {
      const cityValue = editCity.trim();
      const zipValue = editZip.trim() || undefined;
      const updates: { city?: string; zipCode?: string } = {
        city: cityValue || 'Unknown',
      };
      if (zipValue) {
        updates.zipCode = zipValue;
      }
      await updateDoc(doc(db, 'users', user.uid), updates);
      setProfile((prev) => prev ? { ...prev, city: updates.city, zipCode: updates.zipCode || prev.zipCode } : prev);
      setEditing(false);
      toastSuccess('Profile updated!');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to save';
      toastError(message);
    }
  };

  const getDistance = (zip1: string, zip2: string): number | null => {
    const coords1 = ZIP_COORDS[zip1];
    const coords2 = ZIP_COORDS[zip2];
    if (!coords1 || !coords2) return null;
    return haversineMiles(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
  };

  const handleShowNearby = async () => {
    if (!user || !profile?.zipCode) {
      toastInfo('Set your zip code first to find nearby readers');
      return;
    }
    setNearbyLoading(true);
    try {
      // Fetch some sample nearby users
      const nearby: any[] = [];
      for (const [zip, city] of Object.entries(ZIP_CITY_MAP)) {
        if (zip === profile.zipCode) continue;
        const dist = getDistance(profile.zipCode!, zip);
        if (dist && dist <= 200) {
          nearby.push({ city, zip, distance: Math.round(dist) });
        }
      }
      nearby.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(nearby.slice(0, 5));
    } catch {
      toastError('Failed to find nearby users');
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleEditEmail = () => {
    Alert.alert(
      'Change Email',
      'To change your email, please go to Settings and use the password recovery flow, or contact support.',
      [{ text: 'OK' }]
    );
  };

  if (loading || !profile) return (
    <View style={styles.center}>
      <Text style={styles.loadingText}>Loading profile...</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      {/* Profile header */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(profile.fullName || '?')[0].toUpperCase()}
          </Text>
        </View>
        <Text style={styles.name}>{profile.fullName || 'Unknown'}</Text>
        <Text style={styles.username}>@{profile.username || 'N/A'}</Text>
      </View>

      {/* Info card */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>My Profile</Text>
          {!editing && (
            <TouchableOpacity onPress={() => { setEditing(true); setEditCity(profile.city || ''); setEditZip(profile.zipCode || ''); }}>
              <Text style={styles.editLink}>Edit</Text>
            </TouchableOpacity>
          )}
        </View>

        {editing ? (
          <View style={styles.editForm}>
            <Text style={styles.label}>City</Text>
            <TextInput
              style={styles.input}
              value={editCity}
              onChangeText={setEditCity}
              placeholder="Enter your city"
            />
            <Text style={styles.label}>Zip Code</Text>
            <TextInput
              style={styles.input}
              value={editZip}
              onChangeText={setEditZip}
              keyboardType="numeric"
              maxLength={5}
              placeholder="Enter zip code"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                <Text style={styles.saveBtnText}>Save</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <TouchableOpacity onPress={handleEditEmail}>
                <Text style={[styles.infoValue, styles.editableValue]}>{profile.email || 'N/A'}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{profile.username || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{profile.city || 'N/A'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Zip Code</Text>
              <Text style={styles.infoValue}>{profile.zipCode || 'N/A'}</Text>
            </View>
            {profile.birthDate && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Birth Date</Text>
                <Text style={styles.infoValue}>{profile.birthDate}</Text>
              </View>
            )}
          </View>
        )}
      </View>

      {/* Nearby readers */}
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Nearby Readers</Text>
          <TouchableOpacity onPress={handleShowNearby}>
            <Text style={styles.editLink}>Find</Text>
          </TouchableOpacity>
        </View>
        {nearbyLoading ? (
          <Text style={styles.loadingText}>Finding nearby readers...</Text>
        ) : nearbyUsers.length > 0 ? (
          nearbyUsers.map((u, i) => (
            <View key={i} style={styles.nearbyItem}>
              <View style={styles.nearbyAvatar}>
                <Text style={styles.nearbyAvatarText}>{u.city[0]}</Text>
              </View>
              <View style={styles.nearbyInfo}>
                <Text style={styles.nearbyCity}>{u.city}</Text>
                <Text style={styles.nearbyZip}>{u.zip}</Text>
              </View>
              <Text style={styles.nearbyDist}>{u.distance} mi</Text>
            </View>
          ))
        ) : (
          <Text style={styles.subtext}>Tap "Find" to discover readers near you</Text>
        )}
      </View>
    </ScrollView>
  );
}

const ZIP_COORDS: Record<string, { lat: number; lng: number }> = {
  '10001': { lat: 40.7506, lng: -73.9972 },
  '90210': { lat: 34.0901, lng: -118.4065 },
  '33101': { lat: 25.7743, lng: -80.1937 },
  '60601': { lat: 41.8827, lng: -87.6233 },
  '75201': { lat: 32.7826, lng: -96.7982 },
  '30301': { lat: 33.7537, lng: -84.3863 },
  '85001': { lat: 33.4484, lng: -112.0740 },
  '19101': { lat: 39.9526, lng: -75.1652 },
  '77001': { lat: 29.7589, lng: -95.3643 },
  '94101': { lat: 37.7879, lng: -122.4075 },
};

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: '#78716c', fontSize: 16 },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#fde68a',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#92400e' },
  name: { fontSize: 22, fontWeight: 'bold', color: '#92400e', fontFamily: 'serif' },
  username: { fontSize: 14, color: '#78716c', marginTop: 2 },
  card: { padding: 20, backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 16, borderWidth: 1, borderColor: '#fde68a' },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#92400e', fontFamily: 'serif' },
  editLink: { color: '#d97706', fontSize: 16, fontWeight: '600' },
  editForm: { backgroundColor: '#f9fafb', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e7e5e4' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 12, fontSize: 16, marginBottom: 4 },
  buttonRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  saveBtn: { flex: 1, backgroundColor: '#f59e0b', padding: 12, borderRadius: 12, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '600' },
  cancelBtn: { flex: 1, backgroundColor: '#e5e7eb', padding: 12, borderRadius: 12, alignItems: 'center' },
  cancelBtnText: { color: '#374151', fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderColor: '#f3f4f6' },
  infoLabel: { color: '#6b7280', fontSize: 14 },
  infoValue: { color: '#1c1917', fontWeight: '500', fontSize: 14 },
  editableValue: { color: '#d97706' },
  nearbyItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  nearbyAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fde68a', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  nearbyAvatarText: { fontSize: 16, fontWeight: 'bold', color: '#92400e' },
  nearbyInfo: { flex: 1 },
  nearbyCity: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  nearbyZip: { fontSize: 12, color: '#78716c' },
  nearbyDist: { fontSize: 13, color: '#d97706', fontWeight: '600' },
  subtext: { fontSize: 13, color: '#a8a29e', textAlign: 'center', paddingVertical: 8 },
});
