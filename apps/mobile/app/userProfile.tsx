import { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getUserById, type SearchResult } from '@iraval/shared';
import { UserProfileView } from '../screens/UserProfileView';

export default function UserProfileScreen() {
  const router = useRouter();
  const { uid, bookTitle, bookAuthor } = useLocalSearchParams();
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

  if (!user) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>User not found</Text>
      </View>
    );
  }

  const book = bookTitle ? {
    bookId: bookTitle as string,
    title: bookTitle as string,
    author: (bookAuthor as string) || '',
    coverImageURL: '',
    addedBy: uid as string,
    addedByUsername: '',
    addedByFullName: '',
    addedByCity: '',
    addedByZipCode: '',
  } as SearchResult : undefined;

  return (
    <UserProfileView
      user={user}
      book={book}
      onClose={() => router.back()}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffbeb' },
  errorText: { fontSize: 16, color: '#78716c' },
});
