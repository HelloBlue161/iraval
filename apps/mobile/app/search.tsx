import { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  FlatList,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { getUserById, searchAllBooks, getAllBooks, searchUsersWithBook, sendExchangeRequest, sendFriendRequest, getUserProfile } from '@iraval/shared';
import { haversineMiles, LANGUAGES } from '@iraval/shared';
import type { SearchResult, User } from '@iraval/shared';
import { ChatView } from '../screens/ChatView';
import { UserProfileView } from '../screens/UserProfileView';
import { ExchangeRequestView } from '../screens/ExchangeRequestView';

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { info: toastInfo, error: toastError } = useToast();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedBook, setSelectedBook] = useState<SearchResult | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [filterZip, setFilterZip] = useState('');
  const [maxDistance, setMaxDistance] = useState<number>(50);
  const [languageFilter, setLanguageFilter] = useState('');
  const [currentUserZip, setCurrentUserZip] = useState<string>('');
  const [showUser, setShowUser] = useState<User | null>(null);
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [showExchange, setShowExchange] = useState(false);
  const geocodeCache = useRef<Map<string, { lat: number; lng: number }>>(new Map());

  // Get current user zip
  useEffect(() => {
    if (!user) return;
    getUserProfile(user.uid).then((p) => setCurrentUserZip(p?.zipCode || ''));
  }, [user?.uid]);

  const geocodeZip = async (zip: string) => {
    const cached = geocodeCache.current.get(zip);
    if (cached) return cached;
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

  const doSearch = async () => {
    setLoading(true);
    try {
      let found: SearchResult[];
      if (query.trim()) {
        found = await searchAllBooks(query.trim());
      } else {
        found = await getAllBooks();
      }

      // Filter by distance
      if (found.length > 0 && currentUserZip && !filterZip) {
        const myCoords = await geocodeZip(currentUserZip);
        if (myCoords) {
          const zips = new Set(found.map((b) => b.addedByZipCode).filter(Boolean));
          await Promise.all(Array.from(zips).map((z) => geocodeZip(z)));

          const filtered = found.filter((book) => {
            const bookCoords = geocodeCache.current.get(book.addedByZipCode);
            if (!bookCoords) return true;
            const dist = haversineMiles(myCoords.lat, myCoords.lng, bookCoords.lat, bookCoords.lng);
            return dist <= maxDistance;
          });
          found = filtered;
        }
      }

      // Filter by zip
      if (filterZip) {
        found = found.filter((b) => b.addedByZipCode === filterZip);
      }

      // Filter by language
      if (languageFilter) {
        if (languageFilter === 'Other') {
          const knownLangs = ['English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi'];
          found = found.filter((b) => !knownLangs.includes(b.language || ''));
        } else {
          found = found.filter((b) => b.language === languageFilter);
        }
      }

      setResults(found);
      if (found.length === 0 && query.trim()) {
        toastInfo('No books found.');
      }
    } catch {
      toastError('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const findUsers = async (book: SearchResult) => {
    setSelectedBook(book);
    setUsersLoading(true);
    setUsers([]);
    try {
      let foundUsers = await searchUsersWithBook(book.title, user?.uid || undefined);
      // Filter by distance
      if (foundUsers.length > 0 && currentUserZip && !filterZip) {
        const myCoords = await geocodeZip(currentUserZip);
        if (myCoords) {
          for (const u of foundUsers) {
            await geocodeZip(u.zipCode);
          }
          foundUsers = foundUsers.filter((u) => {
            const coords = geocodeCache.current.get(u.zipCode);
            if (!coords) return false;
            const dist = haversineMiles(myCoords.lat, myCoords.lng, coords.lat, coords.lng);
            return dist <= maxDistance;
          });
        }
      }
      if (filterZip) {
        foundUsers = foundUsers.filter((u) => u.zipCode === filterZip);
      }
      setUsers(foundUsers);
    } catch (e) {
      console.error(e);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleUserSelect = async (uid: string) => {
    const userData = await getUserById(uid);
    if (userData) setShowUser(userData);
  };

  const handleChat = async (u: User) => {
    const userData = await getUserById(u.id);
    if (userData) {
      setChatUser(userData);
      setShowChat(true);
    }
  };

  const handleBorrow = async (book: SearchResult, receiverId: string) => {
    await sendExchangeRequest({
      bookId: book.bookId,
      bookTitle: book.title,
      bookAuthor: book.author,
      bookCoverImageURL: book.coverImageURL,
      senderId: user?.uid || '',
      receiverId,
    });
    toastInfo('Borrow request sent!');
  };

  const renderResult = ({ item }: { item: SearchResult }) => {
    let dist: number | null = null;
    if (currentUserZip) {
      const myC = geocodeCache.current.get(currentUserZip);
      const bC = geocodeCache.current.get(item.addedByZipCode);
      if (myC && bC) dist = haversineMiles(myC.lat, myC.lng, bC.lat, bC.lng);
    }

    return (
      <TouchableOpacity style={styles.resultCard} onPress={() => findUsers(item)}>
        <View style={styles.resultCover}>
          {item.coverImageURL ? (
            <Image source={{ uri: item.coverImageURL }} style={styles.resultImage} />
          ) : (
            <Text style={styles.resultIcon}>📖</Text>
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.resultAuthor}>{item.author}</Text>
          <Text style={styles.resultOwner}>by {item.addedByFullName}</Text>
          <Text style={styles.resultMeta}>
            {item.addedByCity}{dist !== null && ` · ${Math.round(dist)} mi`}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (showChat && chatUser) {
    return <ChatView recipient={chatUser} onClose={() => setShowChat(false)} />;
  }

  if (showUser && !showExchange) {
    return (
      <UserProfileView
        user={showUser}
        book={selectedBook}
        onClose={() => setShowUser(null)}
      />
    );
  }

  if (showExchange && selectedBook && showUser) {
    return (
      <ExchangeRequestView
        recipient={showUser}
        book={selectedBook}
        onClose={() => setShowExchange(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a book..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={doSearch}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={doSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.zipInput}
          placeholder="Filter by zip"
          value={filterZip}
          onChangeText={setFilterZip}
          keyboardType="numeric"
          maxLength={5}
        />
        <View style={styles.distRow}>
          <Text style={styles.distLabel}>Max: {maxDistance} mi</Text>
          <TextInput
            style={styles.distInput}
            value={String(maxDistance)}
            onChangeText={(v) => setMaxDistance(Number(v) || 2000)}
            keyboardType="numeric"
          />
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Searching...</Text>
      ) : results.length === 0 && query.trim() ? (
        <Text style={styles.emptyText}>No results for "{query}"</Text>
      ) : results.length === 0 ? (
        <Text style={styles.emptyText}>Search for a book or browse</Text>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => `${item.addedBy}-${item.bookId}`}
          renderItem={renderResult}
          contentContainerStyle={styles.list}
        />
      )}

      {/* Users section */}
      {selectedBook && (
        <View style={styles.usersSection}>
          <Text style={styles.usersTitle}>Readers with "{selectedBook.title}"</Text>
          {usersLoading ? (
            <Text style={styles.loadingText}>Finding readers...</Text>
          ) : users.length === 0 ? (
            <Text style={styles.emptyText}>No readers found</Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.usersScroll}>
              {users.map((u) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.userChip}
                  onPress={() => handleUserSelect(u.id)}
                >
                  <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{(u.fullName || '??').substring(0, 2).toUpperCase()}</Text>
                  </View>
                  <Text style={styles.userName} numberOfLines={1}>{u.fullName}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  searchRow: { flexDirection: 'row', padding: 16, gap: 8 },
  searchInput: { flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 12, fontSize: 16 },
  searchBtn: { backgroundColor: '#f59e0b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
  searchBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  zipInput: { flex: 1, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 8, padding: 8, fontSize: 14 },
  distRow: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 4 },
  distLabel: { fontSize: 13, color: '#78716c' },
  distInput: { width: 50, borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 8, padding: 6, fontSize: 14, textAlign: 'center' },
  list: { padding: 16 },
  resultCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#fde68a' },
  resultCover: { width: 48, height: 64, borderRadius: 8, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resultImage: { width: 48, height: 64, borderRadius: 8 },
  resultIcon: { fontSize: 24 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  resultAuthor: { fontSize: 13, color: '#78716c', marginTop: 2 },
  resultOwner: { fontSize: 12, color: '#d97706', marginTop: 2 },
  resultMeta: { fontSize: 11, color: '#a8a29e', marginTop: 1 },
  usersSection: { padding: 16, borderTopWidth: 1, borderTopColor: '#fde68a', backgroundColor: '#fff' },
  usersTitle: { fontSize: 15, fontWeight: '600', color: '#92400e', marginBottom: 8 },
  usersScroll: { maxHeight: 120 },
  userChip: { width: 80, marginRight: 8, alignItems: 'center', padding: 8, backgroundColor: '#fef3c7', borderRadius: 12, borderWidth: 1, borderColor: '#fde68a' },
  userAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fde68a', alignItems: 'center', justifyContent: 'center' },
  userAvatarText: { fontSize: 12, fontWeight: 'bold', color: '#92400e' },
  userName: { fontSize: 11, color: '#44403c', marginTop: 4, textAlign: 'center' },
  loadingText: { textAlign: 'center', color: '#78716c', paddingVertical: 40 },
  emptyText: { textAlign: 'center', color: '#a8a29e', paddingVertical: 40, fontSize: 16 },
});
