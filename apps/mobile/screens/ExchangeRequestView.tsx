import { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendExchangeRequest } from '@iraval/shared';
import type { User, SearchResult } from '@iraval/shared';

interface ExchangeRequestViewProps {
  recipient: User;
  book: SearchResult;
  onClose: () => void;
}

export function ExchangeRequestView({ recipient, book, onClose }: ExchangeRequestViewProps) {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!user) return;
    setSending(true);
    try {
      await sendExchangeRequest({
        bookId: book.bookId,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookCoverImageURL: book.coverImageURL,
        senderId: user.uid,
        receiverId: recipient.id,
        note: note.trim() || undefined,
      });
      toastSuccess('Exchange request sent!');
      onClose();
    } catch {
      toastError('Failed to send request.');
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      <View style={styles.card}>
        <Text style={styles.title}>Request to Borrow</Text>

        <View style={styles.bookRow}>
          <View style={styles.bookCover}>
            {book.coverImageURL ? (
              <Image source={{ uri: book.coverImageURL }} style={styles.bookImage} />
            ) : (
              <Text style={styles.bookIcon}>📖</Text>
            )}
          </View>
          <View style={styles.bookInfo}>
            <Text style={styles.bookTitle}>{book.title || 'Unknown Book'}</Text>
            <Text style={styles.bookAuthor}>{book.author || 'Unknown Author'}</Text>
            <Text style={styles.ownerText}>Owned by {recipient.fullName}</Text>
          </View>
        </View>

        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Note (optional)</Text>
          <TextInput
            style={styles.noteInput}
            placeholder="e.g., I'd love to read this! Available to meet next week."
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <TouchableOpacity
          style={[styles.sendBtn, sending && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={sending}
        >
          <Text style={styles.sendBtnText}>{sending ? 'Sending...' : 'Send Request'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#fde68a' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#92400e', marginBottom: 16, fontFamily: 'serif' },
  bookRow: { flexDirection: 'row', marginBottom: 16, padding: 12, backgroundColor: '#fef3c7', borderRadius: 12 },
  bookCover: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  bookImage: { width: 48, height: 64, borderRadius: 8 },
  bookIcon: { fontSize: 24 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  bookAuthor: { fontSize: 13, color: '#78716c', marginTop: 2 },
  ownerText: { fontSize: 12, color: '#d97706', fontWeight: '600', marginTop: 2 },
  noteSection: { marginBottom: 16 },
  noteLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 6 },
  noteInput: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#f59e0b', padding: 14, borderRadius: 12, alignItems: 'center', marginBottom: 8 },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#78716c', fontSize: 16 },
});
