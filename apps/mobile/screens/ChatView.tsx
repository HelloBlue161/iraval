import { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { getChatId, onChatMessages, sendMessage } from '@iraval/shared';
import { db } from '../services/firebase';
import { doc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import type { User } from '@iraval/shared';
import type { Message } from '@iraval/shared';

interface ChatViewProps {
  recipient: User;
  onClose: () => void;
}

export function ChatView({ recipient, onClose }: ChatViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');

  const chatId = user ? getChatId(user.uid, recipient.id) : '';

  useEffect(() => {
    if (!chatId) return;
    const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('timestamp', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      const msgs: Message[] = [];
      try {
        snap.forEach((d) => {
          const data = d.data();
          msgs.push({
            id: d.id,
            chatId,
            senderId: data.senderId as string,
            text: data.text as string,
            timestamp: data.timestamp?.toDate() || new Date(),
          });
        });
        setMessages(msgs);
      } catch (e) {
        console.error('ChatView message error:', e);
      }
    }, (error) => {
      console.error('ChatView listener error:', error);
      setMessages([]);
    });
    return unsub;
  }, [chatId]);

  // Scroll to bottom on new messages - React Native doesn't have scrollIntoView
  // so we rely on the inverted FlatList showing latest messages at the bottom naturally

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    await sendMessage(chatId, user.uid, newMessage.trim());
    setNewMessage('');
  };

  const isOwn = (senderId: string) => senderId === user?.uid;

  const renderItem = ({ item }: { item: Message }) => (
    <View style={[styles.bubble, isOwn(item.senderId) ? styles.ownBubble : styles.otherBubble]}>
      <Text style={[styles.msgText, isOwn(item.senderId) && styles.ownMsgText]}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Text style={styles.backBtnText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerUser}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>{(recipient.fullName || '??').substring(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.headerName}>{recipient.fullName || 'Unknown'}</Text>
        </View>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.msgList}
        inverted={false}
      />
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Type a message..."
          value={newMessage}
          onChangeText={setNewMessage}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !newMessage.trim() && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!newMessage.trim()}
        >
          <Text style={styles.sendBtnText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#fde68a', backgroundColor: '#fff' },
  backBtn: { padding: 8 },
  backBtnText: { color: '#d97706', fontSize: 14, fontWeight: '600' },
  headerUser: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  headerAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fde68a', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  headerAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  headerName: { fontSize: 16, fontWeight: '600', color: '#1c1917' },
  msgList: { padding: 16, flexGrow: 1 },
  bubble: { maxWidth: '75%', borderRadius: 16, padding: 12, marginVertical: 4 },
  ownBubble: { backgroundColor: '#f59e0b', marginLeft: 'auto', borderBottomRightRadius: 4 },
  otherBubble: { backgroundColor: '#fff', marginRight: 'auto', borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#fde68a' },
  msgText: { fontSize: 14, color: '#fff' },
  ownMsgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', padding: 12, borderTopWidth: 1, borderTopColor: '#fde68a', backgroundColor: '#fff' },
  input: { flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 10, marginRight: 8, maxHeight: 80, textAlignVertical: 'top' },
  sendBtn: { backgroundColor: '#f59e0b', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center' },
  sendBtnDisabled: { opacity: 0.5 },
  sendBtnText: { color: '#fff', fontWeight: '600' },
});
