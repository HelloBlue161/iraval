import { useState, useEffect, useCallback, useRef } from 'react';
import { User, MapPin, Mail, Hash, Users as UsersIcon, Loader2, Pencil, Save, X } from 'lucide-react';
import { getUserProfile, updateUserProfile } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { haversineMiles } from '../types';
import type { User as UserType } from '../types';
import type { UserProfileData } from '../services/firestoreService';

interface UserWithDistance extends UserType {
  distance: number;
}

export default function ProfileView() {
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [nearbyUsers, setNearbyUsers] = useState<UserWithDistance[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editCity, setEditCity] = useState('');
  const [editZip, setEditZip] = useState('');

  const loadProfile = useCallback(() => {
    if (!currentUser) return;
    getUserProfile(currentUser.uid).then((p) => {
      setProfile(p || null);
      if (p) {
        setEditCity(p.city || '');
        setEditZip(p.zipCode || '');
      }
    });
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    loadProfile();
    loadNearbyUsers(currentUser.uid);
  }, [currentUser?.uid, loadProfile]);

  // Simple cache for zip code → coordinates
  const geocodeCache = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  const geocodeZip = async (zip: string): Promise<{ lat: number; lng: number } | null> => {
    if (geocodeCache.current.has(zip)) return geocodeCache.current.get(zip) || null;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&postalcode=${zip}&limit=1`);
      const data = await res.json();
      if (data.length > 0) {
        const coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        geocodeCache.current.set(zip, coords);
        return coords;
      }
    } catch (e) {
      console.warn('Geocode failed for', zip, e);
    }
    return null;
  };

  const loadNearbyUsers = async (uid: string) => {
    setNearbyLoading(true);
    try {
      const profile = await getUserProfile(uid);
      const myZip = profile?.zipCode || '';
      if (!myZip) {
        setNearbyUsers([]);
        setNearbyLoading(false);
        return;
      }

      const myCoords = await geocodeZip(myZip);
      if (!myCoords) {
        setNearbyUsers([]);
        setNearbyLoading(false);
        return;
      }

      const { getDocs, collection } = await import('firebase/firestore');
      const { db } = await import('../services/firebase');

      const usersSnap = await getDocs(collection(db, 'users'));
      const users: UserWithDistance[] = [];

      for (const doc of usersSnap.docs) {
        const data = doc.data();
        if (!data || doc.id === uid) continue;

        const otherZip = data.zipCode || '';
        if (!otherZip) continue;

        const otherCoords = await geocodeZip(otherZip);
        if (!otherCoords) continue;

        const dist = haversineMiles(
          myCoords.lat, myCoords.lng,
          otherCoords.lat, otherCoords.lng
        );

        if (dist <= 20) {
          users.push({ id: doc.id, ...(data as Omit<UserType, 'id'>), distance: Math.round(dist * 10) / 10 });
        }
      }

      users.sort((a, b) => a.distance - b.distance);
      setNearbyUsers(users);
    } catch (err) {
      console.error('Failed to load nearby users:', err);
    } finally {
      setNearbyLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentUser) return;
    setSaving(true);
    try {
      const cityToSave = editCity.trim() || 'Unknown';
      const zipToSave = editZip.trim().replace(/[^0-9]/g, '').slice(0, 5);
      await updateUserProfile(currentUser.uid, {
        city: cityToSave,
        zipCode: zipToSave || undefined,
      });
      setProfile((prev) => prev ? { ...prev, city: cityToSave, zipCode: zipToSave || undefined } : prev);
      setEditing(false);
      loadProfile();
      if (currentUser) loadNearbyUsers(currentUser.uid);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!currentUser) return null;

  const initials = ((profile?.fullName || currentUser.email || '??').substring(0, 2).toUpperCase());

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-serif text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your details and nearby readers</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-6 shadow-sm mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-lg font-serif">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 font-serif">{profile?.fullName || 'Loading...'}</h2>
              <p className="text-sm text-gray-500">{profile?.email || currentUser.email}</p>
            </div>
          </div>
          {!editing && (
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>

        {editing ? (
          <div className="space-y-4 border border-gray-200 rounded-xl p-4 bg-gray-50">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="Your city"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Zip / Postal Code</label>
              <input
                type="text"
                value={editZip}
                onChange={(e) => setEditZip(e.target.value.replace(/[^0-9]/g, '').slice(0, 5))}
                inputMode="numeric"
                maxLength={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                placeholder="10001"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                onClick={() => {
                  setEditing(false);
                  setEditCity(profile?.city || '');
                  setEditZip(profile?.zipCode || '');
                }}
                className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            {profile?.username && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 text-gray-400" />
                <span>Username: <span className="font-medium text-gray-900">{profile.username}</span></span>
              </div>
            )}
            {profile?.email && (
              <div className="flex items-center gap-2 text-gray-600">
                <Mail className="w-4 h-4 text-gray-400" />
                <span>Email: <span className="font-medium text-gray-900">{profile.email}</span></span>
              </div>
            )}
            {profile?.city && (
              <div className="flex items-center gap-2 text-gray-600">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span>City: <span className="font-medium text-gray-900">{profile.city}</span></span>
              </div>
            )}
            {profile?.zipCode && (
              <div className="flex items-center gap-2 text-gray-600">
                <Hash className="w-4 h-4 text-gray-400" />
                <span>Zip Code: <span className="font-medium text-gray-900">{profile.zipCode}</span></span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Nearby Readers */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-6 shadow-sm">
        <h3 className="text-lg font-bold font-serif text-gray-900 mb-3 flex items-center gap-2">
          <UsersIcon className="w-5 h-5 text-amber-500" />
          Nearby Readers
        </h3>
        <p className="text-xs text-gray-500 mb-4">Within 20 miles of your zip code</p>

        {nearbyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 text-amber-500 animate-spin" />
            <span className="text-sm text-gray-500 ml-2">Loading...</span>
          </div>
        ) : nearbyUsers.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            {profile?.zipCode
              ? 'No readers found nearby'
              : 'Add your zip code in settings to find nearby readers'}
          </p>
        ) : (
          <div className="space-y-2">
            {nearbyUsers.map((u) => (
              <div key={u.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:border-amber-200">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-sm font-serif">
                  {(u.fullName || '??').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm">{u.fullName}</p>
                  <p className="text-xs text-gray-500">
                    {u.city || 'N/A'}{u.zipCode && ` · ${u.zipCode}`}
                  </p>
                </div>
                <span className="text-xs text-amber-600 font-medium">{u.distance} mi</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
