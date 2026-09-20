import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getUserById, checkPendingExchange, isBookUnavailable, sendFriendRequest } from '@iraval/shared';
import type { User, SearchResult } from '@iraval/shared';
import { ChatView } from './ChatView';

interface UserProfileViewProps {
  user: User;
  book?: SearchResult | null;
  onClose: () => void;
}

export function UserProfileView({ user, book, onClose }: UserProfileViewProps) {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { success: toastSuccess, info: toastInfo, error: toastError } = useToast();
  const [friendshipStatus, setFriendshipStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [pendingExchange, setPendingExchange] = useState(false);
  const [bookUnavailable, setBookUnavailable] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || !user) return;
    setStatusLoading(true);

    const checkFriendship = async () => {
      try {
        const { getDocs, query, where, collection } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');
        const acceptedQ1 = query(collection(db, 'friendRequests'), where('senderId', '==', currentUser.uid), where('receiverId', '==', user.id), where('status', '==', 'accepted'));
        const acceptedQ2 = query(collection(db, 'friendRequests'), where('senderId', '==', user.id), where('receiverId', '==', currentUser.uid), where('status', '==', 'accepted'));
        const [snap1, snap2] = await Promise.all([getDocs(acceptedQ1), getDocs(acceptedQ2)]);
        if (!snap1.empty || !snap2.empty) {
          setFriendshipStatus('accepted');
        } else {
          const pendingQ1 = query(collection(db, 'friendRequests'), where('senderId', '==', currentUser.uid), where('receiverId', '==', user.id), where('status', '==', 'pending'));
          const snap = await getDocs(pendingQ1);
          setFriendshipStatus(snap.empty ? 'none' : 'pending');
        }
      } catch (e) {
        console.error(e);
      }
      setStatusLoading(false);
    };
    checkFriendship();
  }, [currentUser?.uid, user.id]);

  useEffect(() => {
    if (!currentUser || !book) { setPendingExchange(false); return; }
    checkPendingExchange(currentUser.uid, user.id, book.title).then((hasPending) => {
      setPendingExchange(hasPending);
    });
    isBookUnavailable(book.bookId, user.id).then((unavailable) => {
      setBookUnavailable(unavailable);
      setPendingExchange((prev) => prev || unavailable);
    });
  }, [currentUser?.uid, user.id, book?.bookId, book?.title]);

  const handleSendFriendRequest = async () => {
    if (!currentUser) return;
    setSendingRequest(true);
    try {
      await sendFriendRequest(currentUser.uid, user.id);
      setFriendshipStatus('pending');
      toastInfo('Friend request sent!');
    } catch {
      toastError('Failed to send friend request.');
    } finally {
      setSendingRequest(false);
    }
  };

  if (showChat) {
    return <ChatView recipient={user} onClose={() => setShowChat(false)} />;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{(user.fullName || '??').substring(0, 2).toUpperCase()}</Text>
        </View>
        <Text style={styles.profileName}>{user.fullName}</Text>
        <Text style={styles.profileEmail}>{user.email}</Text>
        <Text style={styles.profileCity}>{user.city || 'N/A'}</Text>
        {user.zipCode && user.zipCode !== 'Unknown' && (
          <Text style={styles.profileZip}>Zip: {user.zipCode}</Text>
        )}
      </View>

      {book && (
        <View style={styles.bookSection}>
          <Text style={styles.bookTitle}>Book: {book.title || 'Unknown'}</Text>
          <Text style={styles.bookAuthor}>{book.author || 'Unknown'}</Text>
        </View>
      )}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.chatBtn} onPress={() => setShowChat(true)}>
          <Text style={styles.chatBtnText}>💬 Send Message</Text>
        </TouchableOpacity>

        {book && (
          <View style={styles.borrowSection}>
            {pendingExchange ? (
              <View style={styles.borrowDisabled}>
                <Text style={styles.borrowDisabledText}>
                  {bookUnavailable ? 'This Book is Currently Unavailable' : 'Request to Borrow Already Sent'}
                </Text>
              </View>
            ) : (
              <TouchableOpacity style={styles.borrowBtn} onPress={() => setShowExchange(true)}>
                <Text style={styles.borrowBtnText}>Request to Borrow</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.borrowSubtext}>
              {bookUnavailable ? 'This book is involved in an active exchange' : pendingExchange ? 'Waiting for the owner to respond' : 'Formal borrow request — the owner must accept before you can borrow'}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={styles.friendBtn}
          onPress={handleSendFriendRequest}
          disabled={sendingRequest || friendshipStatus === 'accepted' || statusLoading}
        >
          {statusLoading ? (
            <ActivityIndicator color="#374151" />
          ) : friendshipStatus === 'accepted' ? (
            <Text style={styles.friendBtnText}>✓ Already Friends</Text>
          ) : friendshipStatus === 'pending' ? (
            <Text style={styles.friendBtnText}>✓ Request Sent</Text>
          ) : (
            <Text style={styles.friendBtnText}>+ Add Friend</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
        <Text style={styles.closeBtnText}>Close</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  profileSection: { alignItems: 'center', padding: 24, paddingBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#fde68a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 28, fontWeight: 'bold', color: '#92400e' },
  profileName: { fontSize: 22, fontWeight: 'bold', color: '#1c1917', marginTop: 12, fontFamily: 'serif' },
  profileEmail: { fontSize: 14, color: '#78716c', marginTop: 4 },
  profileCity: { fontSize: 14, color: '#d97706', fontWeight: '600', marginTop: 4 },
  profileZip: { fontSize: 12, color: '#a8a29e', marginTop: 2 },
  bookSection: { marginHorizontal: 20, padding: 16, backgroundColor: '#fef3c7', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a', marginBottom: 16 },
  bookTitle: { fontSize: 16, fontWeight: '600', color: '#92400e' },
  bookAuthor: { fontSize: 13, color: '#78716c', marginTop: 2 },
  actions: { paddingHorizontal: 20, gap: 12 },
  chatBtn: { backgroundColor: '#f59e0b', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  chatBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  borrowSection: { alignItems: 'center' },
  borrowDisabled: { backgroundColor: '#f3f4f6', borderWidth: 2, borderColor: '#d1d5db', paddingVertical: 14, borderRadius: 12, paddingHorizontal: 20, alignItems: 'center' },
  borrowDisabledText: { color: '#6b7280', fontSize: 16, fontWeight: '600' },
  borrowBtn: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#d97706', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  borrowBtnText: { color: '#92400e', fontSize: 16, fontWeight: '600' },
  borrowSubtext: { fontSize: 12, color: '#a8a29e', marginTop: 6, textAlign: 'center' },
  friendBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#d1d5db', paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  friendBtnText: { color: '#374151', fontSize: 15, fontWeight: '500' },
  closeBtn: { marginHorizontal: 20, marginTop: 20, padding: 14, alignItems: 'center' },
  closeBtnText: { color: '#78716c', fontSize: 16 },
});
