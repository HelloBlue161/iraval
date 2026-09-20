import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { acceptFriendRequest, declineFriendRequest, getUserById } from '@iraval/shared';
import type { FriendRequest, FriendRequestStatus, User } from '@iraval/shared';

interface FriendRequestViewProps {
  onSendToChat?: (user: User) => void;
}

export function FriendRequestView({ onSendToChat }: FriendRequestViewProps) {
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, info: toastInfo, error: toastError } = useToast();
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [usernames, setUsernames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    const load = async () => {
      setLoading(true);
      try {
        // Incoming
        const q1 = query(collection(db, 'friendRequests'), where('receiverId', '==', currentUser.uid), where('status', '==', 'pending'));
        const s1 = await getDocs(q1);
        const inc: FriendRequest[] = [];
        s1.forEach((d) => {
          const data = d.data();
          inc.push({ id: d.id, senderId: data.senderId as string, receiverId: data.receiverId as string, status: data.status as FriendRequestStatus, sentAt: data.sentAt?.toDate() || new Date() });
        });
        setIncoming(inc);

        // Outgoing
        const q2 = query(collection(db, 'friendRequests'), where('senderId', '==', currentUser.uid), where('status', '==', 'pending'));
        const s2 = await getDocs(q2);
        const out: FriendRequest[] = [];
        s2.forEach((d) => {
          const data = d.data();
          out.push({ id: d.id, senderId: data.senderId as string, receiverId: data.receiverId as string, status: data.status as FriendRequestStatus, sentAt: data.sentAt?.toDate() || new Date() });
        });
        setOutgoing(out);

        // Load names
        const names: Record<string, string> = {};
        const uids = new Set([...inc.map((r) => r.senderId), ...out.map((r) => r.receiverId)]);
        for (const uid of uids) {
          const u = await getUserById(uid);
          if (u) names[uid] = u.fullName;
        }
        setUsernames(names);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [currentUser?.uid]);

  const handleAccept = async (id: string) => {
    try {
      await acceptFriendRequest(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      toastSuccess('Friend request accepted!');
    } catch {
      toastError('Failed to accept.');
    }
  };

  const handleDecline = async (id: string) => {
    try {
      await declineFriendRequest(id);
      setIncoming((prev) => prev.filter((r) => r.id !== id));
      toastInfo('Request declined.');
    } catch {
      toastError('Failed to decline.');
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#d97706" /></View>;
  }

  if (incoming.length === 0 && outgoing.length === 0) {
    return <View style={styles.center}><Text style={styles.emptyText}>No friend requests</Text></View>;
  }

  return (
    <ScrollView style={styles.container}>
      {incoming.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Incoming Requests</Text>
          {incoming.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{usernames[req.senderId] || req.senderId}</Text>
                <Text style={styles.requestSub}>wants to be your friend</Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(req.id)}>
                  <Text style={styles.acceptBtnText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.declineBtn} onPress={() => handleDecline(req.id)}>
                  <Text style={styles.declineBtnText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {outgoing.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Outgoing Requests</Text>
          {outgoing.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestName}>{usernames[req.receiverId] || req.receiverId}</Text>
                <Text style={styles.requestSub}>waiting for response</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 18, color: '#78716c' },
  section: { padding: 16, marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  requestCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#fde68a' },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 16, fontWeight: '600', color: '#1c1917' },
  requestSub: { fontSize: 13, color: '#78716c', marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: { flex: 1, backgroundColor: '#16a34a', padding: 10, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '600' },
  declineBtn: { flex: 1, backgroundColor: '#dc2626', padding: 10, borderRadius: 8, alignItems: 'center' },
  declineBtnText: { color: '#fff', fontWeight: '600' },
});
