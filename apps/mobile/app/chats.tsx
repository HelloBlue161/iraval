import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { getUserChats } from '@iraval/shared';
import type { UserChat } from '@iraval/shared';
import { FriendRequestView } from '../screens/FriendRequestView';

export default function ChatsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [chats, setChats] = useState<UserChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'chats' | 'friends'>('chats');

  useEffect(() => {
    if (!user) return;
    getUserChats(user.uid).then((c) => {
      setChats(c);
      setLoading(false);
    });
  }, [user?.uid]);

  if (activeTab === 'friends') {
    return <FriendRequestView />;
  }

  if (loading) return <View style={styles.center}><Text>Loading...</Text></View>;
  if (chats.length === 0) return (
    <View style={styles.center}>
      <Text style={styles.emptyIcon}>💬</Text>
      <Text style={styles.emptyText}>No chats yet</Text>
      <Text style={styles.emptySub}>Chat with readers after an exchange</Text>
    </View>
  );

  // activeTab is 'chats' here since 'friends' returns early above
  const isChatsActive = activeTab === ('chats' as 'chats' | 'friends');
  const isFriendsActive = activeTab === ('friends' as 'chats' | 'friends');

  return (
    <View style={styles.container}>
      <View style={styles.tabs}>
        <TouchableOpacity style={[styles.tab, isChatsActive && styles.tabActive]} onPress={() => setActiveTab('chats')}>
          <Text style={[styles.tabText, isChatsActive && styles.tabTextActive]}>Chats</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, isFriendsActive && styles.tabActive]} onPress={() => setActiveTab('friends')}>
          <Text style={[styles.tabText, isFriendsActive && styles.tabTextActive]}>Friends</Text>
        </TouchableOpacity>
      </View>
      <ScrollView>
        {chats.map((chat) => (
          <TouchableOpacity key={chat.chatId} style={styles.chatItem}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(chat.otherUserName || '??').substring(0, 2).toUpperCase()}</Text>
            </View>
            <View style={styles.chatInfo}>
              <Text style={styles.chatName}>{chat.otherUserName}</Text>
              <Text style={styles.chatLast} numberOfLines={1}>{chat.lastMessage || 'Tap to chat'}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#78716c', fontWeight: '500' },
  emptySub: { fontSize: 14, color: '#a8a29e', marginTop: 4 },
  tabs: { flexDirection: 'row', paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#fde68a', backgroundColor: '#fff' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#d97706' },
  tabText: { fontSize: 16, color: '#78716c', fontWeight: '600' },
  tabTextActive: { color: '#92400e' },
  chatItem: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#fde68a', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 14, fontWeight: 'bold', color: '#92400e' },
  chatInfo: { flex: 1, marginLeft: 12 },
  chatName: { fontSize: 16, fontWeight: '600', color: '#1c1917' },
  chatLast: { fontSize: 13, color: '#78716c', marginTop: 2 },
  chevron: { fontSize: 24, color: '#a8a29e' },
});
