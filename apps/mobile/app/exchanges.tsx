import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, TextInput, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { onUserExchanges, acceptExchange, declineExchange, getUserById } from '@iraval/shared';
import type { Exchange, User } from '@iraval/shared';
import { ChatView } from '../screens/ChatView';

export default function ExchangesScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { success: toastSuccess, info: toastInfo, error: toastError } = useToast();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [declineModal, setDeclineModal] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsub = onUserExchanges(user.uid, (exs) => {
      setExchanges(exs);
      setLoading(false);

      // Load names for all exchanges
      exs.forEach((ex) => {
        if (ex.senderId === user.uid && !recipientNames[ex.receiverId]) {
          getUserById(ex.receiverId).then((u) => {
            if (u) setRecipientNames((p) => ({ ...p, [ex.receiverId]: u.fullName }));
          });
        }
        if (ex.receiverId === user.uid && !senderNames[ex.senderId]) {
          getUserById(ex.senderId).then((u) => {
            if (u) setSenderNames((p) => ({ ...p, [ex.senderId]: u.fullName }));
          });
        }
      });
    });
    return unsub;
  }, [user?.uid]);

  const handleAccept = async (id: string) => {
    try {
      await acceptExchange(id);
      toastSuccess('Exchange accepted! You can now chat to coordinate.');
    } catch {
      toastError('Failed to accept exchange.');
    }
  };

  const openDecline = (id: string) => { setDeclineModal(id); setDeclineNote(''); };

  const handleDecline = async (id: string) => {
    try {
      const noteToUse = declineNote.trim() || undefined;
      await declineExchange(id, noteToUse);
      setDeclineModal(null);
      setDeclineNote('');
      if (noteToUse) toastInfo('Declined with note saved to the request.');
      else toastInfo('Exchange declined.');
    } catch {
      toastError('Failed to decline exchange.');
    }
  };

  const handleChat = async (ex: Exchange) => {
    const otherId = ex.senderId === user?.uid ? ex.receiverId : ex.senderId;
    const userData = await getUserById(otherId);
    if (userData) { setChatUser(userData); setShowChat(true); }
  };

  if (showChat && chatUser) {
    return <ChatView recipient={chatUser} onClose={() => setShowChat(false)} />;
  }

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;
  if (exchanges.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>📦</Text>
      <Text style={styles.emptyText}>No exchanges yet</Text>
    </View>
  );

  // Sort: pending first, then accepted, then declined
  const order: Record<string, number> = { pending: 0, accepted: 1, declined: 2 };

  return (
    <View style={styles.container}>
      <ScrollView>
        {exchanges
          .sort((a, b) => (order[a.status] ?? 0) - (order[b.status] ?? 0))
          .map((ex) => {
            const isOwn = ex.senderId === user?.uid;
            const isIncoming = !isOwn;
            const otherName = isOwn ? (recipientNames[ex.receiverId] || 'Loading...') : (senderNames[ex.senderId] || 'Loading...');

            return (
              <View key={ex.id} style={[styles.card, ex.status === 'pending' && styles.cardPending]}>
                <View style={styles.cardHeader}>
                  <Text style={styles.cardTitle}>{ex.bookTitle || 'Unknown'}</Text>
                  <View style={[styles.badge, ex.status === 'accepted' && styles.badgeAccepted, ex.status === 'declined' && styles.badgeDeclined, ex.status === 'pending' && styles.badgePending]}>
                    <Text style={styles.badgeText}>{ex.status.charAt(0).toUpperCase() + ex.status.slice(1)}</Text>
                  </View>
                </View>
                <Text style={styles.cardAuthor}>{ex.bookAuthor || 'Unknown'}</Text>
                <Text style={styles.cardOther}>{isOwn ? `To: ${otherName}` : `From: ${otherName}`}</Text>
                {ex.note && <Text style={styles.note}>"{ex.note}"</Text>}
                {ex.declineNote && <Text style={[styles.note, styles.declineNote]}>Decline: "{ex.declineNote}"</Text>}

                {ex.status === 'accepted' && (
                  <TouchableOpacity style={styles.chatBtn} onPress={() => handleChat(ex)}>
                    <Text style={styles.chatBtnText}>💬 Chat to coordinate</Text>
                  </TouchableOpacity>
                )}

                {ex.status === 'pending' && isIncoming && (
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleAccept(ex.id)}>
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.declineBtn} onPress={() => openDecline(ex.id)}>
                      <Text style={styles.declineBtnText}>Decline</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
      </ScrollView>

      {/* Decline modal */}
      <Modal visible={!!declineModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Decline Request</Text>
            <Text style={styles.modalSub}>Add a note explaining why (optional)</Text>
            <TextInput
              style={styles.noteInput}
              placeholder='e.g., Book not available until next month...'
              value={declineNote}
              onChangeText={setDeclineNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalDeclineBtn} onPress={() => declineModal && handleDecline(declineModal)}>
                <Text style={styles.modalDeclineBtnText}>Decline</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setDeclineModal(null)}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#78716c', fontWeight: '500' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginHorizontal: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  cardPending: { borderColor: '#fde68a' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1c1917', flex: 1 },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: '#f3f4f6' },
  badgeAccepted: { backgroundColor: '#dcfce7' },
  badgeDeclined: { backgroundColor: '#fee2e2' },
  badgePending: { backgroundColor: '#fef3c7' },
  badgeText: { fontSize: 11, fontWeight: '600', color: '#1c1917' },
  cardAuthor: { fontSize: 13, color: '#78716c', marginTop: 4 },
  cardOther: { fontSize: 13, color: '#d97706', marginTop: 2 },
  note: { fontSize: 12, color: '#6b7280', fontStyle: 'italic', marginTop: 8, backgroundColor: '#f9fafb', padding: 8, borderRadius: 8 },
  declineNote: { color: '#dc2626', backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  acceptBtn: { flex: 1, backgroundColor: '#16a34a', padding: 12, borderRadius: 8, alignItems: 'center' },
  acceptBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  declineBtn: { flex: 1, backgroundColor: '#dc2626', padding: 12, borderRadius: 8, alignItems: 'center' },
  declineBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  chatBtn: { marginTop: 12, backgroundColor: '#dcfce7', padding: 12, borderRadius: 8, alignItems: 'center' },
  chatBtnText: { color: '#15803d', fontWeight: '600', fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '85%', maxWidth: 400 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#92400e', marginBottom: 4, fontFamily: 'serif' },
  modalSub: { fontSize: 14, color: '#78716c', marginBottom: 12 },
  noteInput: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 8 },
  modalDeclineBtn: { flex: 1, backgroundColor: '#dc2626', padding: 12, borderRadius: 10, alignItems: 'center' },
  modalDeclineBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  modalCancelBtn: { flex: 1, padding: 12, alignItems: 'center' },
  modalCancelBtnText: { color: '#78716c', fontSize: 16 },
});
