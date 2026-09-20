import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserById } from '@iraval/shared';
import { ChatView } from '../screens/ChatView';

export default function ChatScreen() {
  const router = useRouter();
  const { uid } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!uid) return;
    getUserById(uid as string).then((u) => {
      if (u) setUser(u);
    });
  }, [uid]);

  if (!user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  return <ChatView recipient={user} onClose={() => router.back()} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbeb' },
});
