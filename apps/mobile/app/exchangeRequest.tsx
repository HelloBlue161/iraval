import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserById, type SearchResult } from '@iraval/shared';
import { ExchangeRequestView } from '../screens/ExchangeRequestView';

export default function ExchangeRequestScreen() {
  const router = useRouter();
  const { uid, bookId, bookTitle, bookAuthor } = useLocalSearchParams();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    getUserById(uid as string).then((u) => {
      if (u) setUser(u);
      setLoading(false);
    });
  }, [uid]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#d97706" />
      </View>
    );
  }

  if (!user || !bookTitle) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Missing information</Text>
      </View>
    );
  }

  return (
    <ExchangeRequestView
      recipient={user}
      book={{
        bookId: (bookId as string) || '',
        title: bookTitle as string,
        author: (bookAuthor as string) || '',
      } as SearchResult}
      onClose={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbeb' },
  errorText: { fontSize: 16, color: '#78716c' },
});
