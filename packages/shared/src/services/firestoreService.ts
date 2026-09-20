import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  limit,
  type Unsubscribe,
  getDoc,
  getDocs,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Book, Exchange, FriendRequest, Message, User } from '../types';

// ── User Services ──────────────────────────────────────────────

export function onUser(uid: string, callback: (user: User | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    if (snap.exists()) {
      callback({ id: snap.id, ...(snap.data() as Omit<User, 'id'>) });
    } else {
      callback(null);
    }
  });
}

// ── Book Services ──────────────────────────────────────────────

export function onUserBooks(
  uid: string,
  callback: (books: Book[]) => void
): Unsubscribe {
  const allExchanges: Exchange[] = [];
  const bookMap = new Map<string, Book>();

  const emit = () => {
    const result: Book[] = [];
    bookMap.forEach((book) => {
      const bookTitle = (book.title || '').toLowerCase().trim();
      const directEx = allExchanges.find(
        (e) => e.bookId === book.id && e.status !== 'declined'
      );
      if (directEx) {
        if (directEx.status === 'accepted') {
          result.push({ ...book, id: book.id, bookStatus: directEx.senderId === uid ? 'borrowed' : 'lent' });
        } else if (directEx.status === 'pending') {
          result.push({ ...book, id: book.id, bookStatus: 'pending_exchange' });
        } else {
          result.push({ ...book, id: book.id, bookStatus: 'available' });
        }
      } else {
        const titleEx = allExchanges.find(
          (e) => e.bookTitle?.toLowerCase() === bookTitle && e.status !== 'declined'
        );
        if (titleEx) {
          result.push({ ...book, id: book.id, bookStatus: titleEx.status === 'accepted' ? (titleEx.senderId === uid ? 'borrowed' : 'lent') : 'pending_exchange' });
        } else {
          result.push({ ...book, id: book.id, bookStatus: 'available' });
        }
      }
    });
    callback(result);
  };

  // Load exchanges once
  const loadExchangesOnce = () => {
    try {
      const check = (q: import('firebase/firestore').Query) =>
        getDocs(q).then((snap) => {
          snap.forEach((d) => {
            allExchanges.push(d.data() as Exchange);
          });
        }).catch(() => {});
      Promise.all([
        check(query(collection(db, 'exchanges'), where('senderId', '==', uid))),
        check(query(collection(db, 'exchanges'), where('receiverId', '==', uid))),
      ]).then(() => {
        emit();
      }).catch(() => emit());
    } catch {
      emit();
    }
  };
  loadExchangesOnce();

  // Simple book subscription - no orderBy to avoid index issues
  try {
    const unsub = onSnapshot(
      collection(db, 'users', uid, 'books'),
      (snap) => {
        bookMap.clear();
        snap.forEach((docSnap) => {
          const data = docSnap.data() as Omit<Book, 'id'>;
          bookMap.set(docSnap.id, { ...data, id: docSnap.id } as Book);
        });
        emit();
      },
      () => {
        // Swallow errors - just return empty
        callback([]);
      }
    );
    return unsub;
  } catch {
    // If even the basic subscription fails, return no-op
    callback([]);
    return () => {};
  }
}

export async function addBook(uid: string, book: Book): Promise<void> {
  await setDoc(doc(db, 'users', uid, 'books', book.id), {
    ...book,
    addedAt: new Date().toISOString(),
  });
}

export async function deleteBook(uid: string, bookId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', uid, 'books', bookId));
}

export async function updateBook(uid: string, bookId: string, updates: {
  title?: string;
  author?: string;
  coverImageURL?: string;
  language?: string;
}): Promise<void> {
  await updateDoc(doc(db, 'users', uid, 'books', bookId), updates);
}

// ── Friend Request Services ────────────────────────────────────

export function onIncomingRequests(
  receiverId: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('receiverId', '==', receiverId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, (snap) => {
    const requests: FriendRequest[] = [];
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      requests.push({
        id: docSnap.id,
        ...(data as Omit<FriendRequest, 'id'>),
        sentAt: data.sentAt?.toDate() || new Date(),
      });
    });
    callback(requests);
  });
}

export function onOutgoingRequests(
  senderId: string,
  callback: (requests: FriendRequest[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'friendRequests'),
    where('senderId', '==', senderId),
    where('status', '==', 'pending')
  );
  return onSnapshot(q, async (snap) => {
    const requests: FriendRequest[] = [];
    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const receiverId = data.receiverId as string;

      // Check if receiver already sent an accepted request back to sender
      const reverseQ = query(
        collection(db, 'friendRequests'),
        where('senderId', '==', receiverId),
        where('receiverId', '==', senderId),
        where('status', '==', 'accepted')
      );
      const reverseSnap = await getDocs(reverseQ);
      if (!reverseSnap.empty) continue; // Already friends — skip this pending request

      requests.push({
        id: docSnap.id,
        ...(data as Omit<FriendRequest, 'id'>),
        sentAt: data.sentAt?.toDate() || new Date(),
      });
    }
    callback(requests);
  });
}

export async function sendFriendRequest(
  senderId: string,
  receiverId: string,
  status: 'pending' = 'pending'
): Promise<void> {
  const id = `${senderId}_${receiverId}_${Date.now()}`;
  await setDoc(doc(db, 'friendRequests', id), {
    senderId,
    receiverId,
    status,
    sentAt: serverTimestamp(),
  });
}

export async function acceptFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status: 'accepted',
  });
}

export async function declineFriendRequest(requestId: string): Promise<void> {
  await updateDoc(doc(db, 'friendRequests', requestId), {
    status: 'declined',
  });
}

// ── Message / Chat Services ────────────────────────────────────

export function getChatId(uid1: string, uid2: string): string {
  const ids = [uid1, uid2].sort();
  return `chat_${ids[0]}_${ids[1]}`;
}

export function onChatMessages(
  chatId: string,
  callback: (messages: Message[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chats', chatId, 'messages'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    try {
      const messages: Message[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        messages.push({
          id: docSnap.id,
          ...(data as Omit<Message, 'id'>),
          timestamp: data.timestamp?.toDate() || new Date(),
        });
      });
      callback(messages);
    } catch (e) {
      console.error('onChatMessages error:', e);
      callback([]);
    }
  }, (error) => {
    console.error('onChatMessages listener error:', error);
    callback([]);
  });
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
): Promise<void> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const message: Omit<Message, 'id'> = {
    chatId,
    senderId,
    text,
    timestamp: new Date(),
  };
  await setDoc(doc(db, 'chats', chatId, 'messages', messageId), message);
}

// ── Chat List (all conversations the user participated in) ─────

export interface UserChat {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
}

export async function getUserChats(uid: string): Promise<UserChat[]> {
  const chatsRef = collection(db, 'chats');
  const snap = await getDocs(chatsRef);

  const result: UserChat[] = [];

  for (const chatDoc of snap.docs) {
    const chatId = chatDoc.id;
    // chatId format: chat_{uid1}_{uid2}
    const parts = chatId.replace('chat_', '').split('_');
    if (parts.length < 3) continue;
    const [p1, p2] = [parts[0], parts.slice(1).join('_')];
    const otherUserId = p1 === uid ? p2 : p1;
    if (otherUserId === uid) continue;

    // Get last message from this chat
    const msgsRef = collection(db, 'chats', chatId, 'messages');
    const msgsQuery = query(msgsRef, orderBy('timestamp', 'desc'), limit(1));
    const msgsSnap = await getDocs(msgsQuery);

    let lastMessage: string | undefined;
    let lastMessageTime: Date | undefined;
    if (!msgsSnap.empty) {
      const lastData = msgsSnap.docs[0].data();
      lastMessage = lastData.text;
      lastMessageTime = lastData.timestamp?.toDate();
    }

    // Fetch other user's name
    const otherSnap = await getDoc(doc(db, 'users', otherUserId));
    const otherName = otherSnap.exists() ? (otherSnap.data().fullName || '') : 'Unknown';

    result.push({ chatId, otherUserId, otherUserName: otherName, lastMessage, lastMessageTime });
  }

  result.sort((a, b) => {
    const ta = a.lastMessageTime?.getTime() || 0;
    const tb = b.lastMessageTime?.getTime() || 0;
    return tb - ta;
  });

  return result;
}

// ── Friends (accepted requests) ────────────────────────────────

export async function getAcceptedFriends(uid: string): Promise<User[]> {
  const q1 = query(
    collection(db, 'friendRequests'),
    where('senderId', '==', uid),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    collection(db, 'friendRequests'),
    where('receiverId', '==', uid),
    where('status', '==', 'accepted')
  );
  const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
  const friendIds = new Set<string>();
  snap1.forEach((d) => { friendIds.add((d.data() as { receiverId: string }).receiverId); });
  snap2.forEach((d) => { friendIds.add((d.data() as { senderId: string }).senderId); });

  const friends: User[] = [];
  for (const fid of friendIds) {
    const user = await getUserById(fid);
    if (user) {
      friends.push(user);
    }
  }
  return friends;
}

// ── Book Search (users who have a book) ─────────────────────────

export async function searchUsersWithBook(
  bookTitle: string,
  excludeUid?: string
): Promise<User[]> {
  // Get books involved in active exchanges to filter them out
  const unavailableIds = await getUnavailableBookIds();

  // Search for users who have a book matching the title
  const usersRef = collection(db, 'users');
  const usersSnap = await getDocs(usersRef);

  const results: User[] = [];
  const titleLower = bookTitle.toLowerCase().trim();

  if (!titleLower) return results;

  for (const userDoc of usersSnap.docs) {
    const uid = userDoc.id;
    const userData = userDoc.data();

    // Skip duplicate username-based user documents (e.g. "user_bob")
    if (userData && userData.uid && userData.uid !== uid) continue;

    // Skip the current user
    if (excludeUid && uid === excludeUid) continue;

    const booksRef = collection(db, 'users', uid, 'books');
    const booksSnap = await getDocs(booksRef);

    for (const bookDoc of booksSnap.docs) {
      const bookData = bookDoc.data();
      if (bookData.title?.toLowerCase().includes(titleLower)) {
        // Skip if this book has an active exchange (lent/pending/borrowed)
        if (unavailableIds.has(bookDoc.id)) continue;
        // User has this available book
        if (!results.find((u) => u.id === uid)) {
          results.push({ id: uid, ...(userData as Omit<User, 'id'>) });
        }
        break;
      }
    }
  }

  return results;
}

export function onFriends(
  uid: string,
  callback: (friends: User[]) => void
): Unsubscribe {
  let unsubscribe1: Unsubscribe | null = null;
  let unsubscribe2: Unsubscribe | null = null;

  const doLoad = async () => {
    const friends = await getAcceptedFriends(uid);
    callback(friends);
  };

  // Listen for changes in accepted requests
  const q1 = query(
    collection(db, 'friendRequests'),
    where('senderId', '==', uid),
    where('status', '==', 'accepted')
  );
  const q2 = query(
    collection(db, 'friendRequests'),
    where('receiverId', '==', uid),
    where('status', '==', 'accepted')
  );

  unsubscribe1 = onSnapshot(q1, doLoad);
  unsubscribe2 = onSnapshot(q2, doLoad);

  return () => { unsubscribe1?.(); unsubscribe2?.(); };
}

export interface UserProfileData {
  username?: string;
  email?: string;
  fullName?: string;
  city?: string;
  zipCode?: string;
  birthDate?: string;
  phone?: string;
  profileImageURL?: string;
  createdAt?: string;
  emailVerified?: boolean;
}

export async function getUserProfile(uid: string): Promise<UserProfileData | null> {
  const snap = await getDoc(doc(db, 'users', uid));
  if (snap.exists()) return snap.data() as UserProfileData;
  return null;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfileData>): Promise<void> {
  await updateDoc(doc(db, 'users', uid), updates);
}

export async function getUserById(idOrUsername: string): Promise<User | null> {
  // First try as document ID (Auth UID)
  const snap = await getDoc(doc(db, 'users', idOrUsername));
  if (snap.exists()) return { id: snap.id, ...(snap.data() as Omit<User, 'id'>) };

  // If not found, try as username
  const q = query(collection(db, 'users'), where('username', '==', idOrUsername));
  const querySnap = await getDocs(q);
  if (!querySnap.empty) {
    const docSnap = querySnap.docs[0];
    return { id: docSnap.id, ...(docSnap.data() as Omit<User, 'id'>) };
  }

  return null;
}

// ── Book Exchange ──────────────────────────────────────────────

export async function sendExchangeRequest(exchange: {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverImageURL?: string;
  senderId: string;
  receiverId: string;
  note?: string;
}): Promise<void> {
  const id = `ex_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  console.log('[Exchange] Creating exchange:', { id, ...exchange });
  const data: Record<string, unknown> = {
    bookId: exchange.bookId,
    bookTitle: exchange.bookTitle,
    bookAuthor: exchange.bookAuthor,
    senderId: exchange.senderId,
    receiverId: exchange.receiverId,
    status: 'pending',
    requestedAt: new Date(),
  };
  if (exchange.bookCoverImageURL) {
    data.bookCoverImageURL = exchange.bookCoverImageURL;
  }
  if (exchange.note) {
    data.note = exchange.note;
  }
  await setDoc(doc(db, 'exchanges', id), data);
  console.log('[Exchange] Exchange created successfully');
}

export async function checkPendingExchange(senderId: string, receiverId: string, bookTitle: string): Promise<boolean> {
  // Check if a pending or accepted exchange already exists from sender to receiver for this book
  const q = query(
    collection(db, 'exchanges'),
    where('senderId', '==', senderId),
    where('receiverId', '==', receiverId),
    where('status', 'in', ['pending', 'accepted'] as const)
  );
  const snap = await getDocs(q);
  for (const doc of snap.docs) {
    const data = doc.data();
    if ((data as { bookTitle?: string }).bookTitle?.toLowerCase() === bookTitle.toLowerCase()) {
      return true;
    }
  }
  return false;
}

// Check if a book (by document ID) has any active exchange involving a specific user
export async function isBookUnavailable(bookId: string, userId: string): Promise<boolean> {
  const q = query(
    collection(db, 'exchanges'),
    where('bookId', '==', bookId),
    where('status', 'in', ['pending', 'accepted'] as const),
    where('receiverId', '==', userId)
  );
  const snap = await getDocs(q);
  return !snap.empty;
}

export function onUserExchanges(
  uid: string,
  callback: (exchanges: Exchange[]) => void
): Unsubscribe {
  const q1 = query(collection(db, 'exchanges'), where('senderId', '==', uid));
  const q2 = query(collection(db, 'exchanges'), where('receiverId', '==', uid));

  // Track exchanges: key = exchange id, value = exchange data
  const exchangeMap = new Map<string, Exchange>();
  // Track which queries each exchange appears in
  const querySet1 = new Set<string>(); // exchanges from q1 (user is sender)
  const querySet2 = new Set<string>(); // exchanges from q2 (user is receiver)

  const emit = () => {
    callback(Array.from(exchangeMap.values()));
  };

  const processSnap = (
    snap: import('firebase/firestore').QuerySnapshot,
    querySet: Set<string>
  ) => {
    const currentIds = new Set<string>();
    snap.forEach((d) => {
      currentIds.add(d.id);
      querySet.add(d.id);
      if (!exchangeMap.has(d.id)) {
        exchangeMap.set(d.id, { id: d.id, ...(d.data() as Omit<Exchange, 'id'>) });
      }
    });

    // Remove exchanges that are no longer in THIS query
    // (they may still exist in the other query, so don't remove from exchangeMap yet)
    for (const id of querySet) {
      if (!currentIds.has(id)) {
        querySet.delete(id);
        // Only remove from exchangeMap if the exchange is in neither query
        if (!querySet1.has(id) || !querySet2.has(id)) {
          exchangeMap.delete(id);
        }
      }
    }

    emit();
  };

  const unsub1 = onSnapshot(q1, (snap) => {
    processSnap(snap, querySet1);
  });

  const unsub2 = onSnapshot(q2, (snap) => {
    processSnap(snap, querySet2);
  });

  return () => { unsub1(); unsub2(); };
}

export async function acceptExchange(exchangeId: string): Promise<void> {
  await updateDoc(doc(db, 'exchanges', exchangeId), {
    status: 'accepted',
    respondedAt: new Date(),
  });
}

export async function declineExchange(exchangeId: string, note?: string): Promise<void> {
  await updateDoc(doc(db, 'exchanges', exchangeId), {
    status: 'declined',
    respondedAt: new Date(),
    ...(note ? { declineNote: note } : {}),
  });
}

// ── Helpers for filtering unavailable books ─────────────────────

// Returns a Set of bookIds that have any pending or accepted exchange
async function getUnavailableBookIds(): Promise<Set<string>> {
  const q = query(collection(db, 'exchanges'), where('status', 'in', ['pending', 'accepted'] as const));
  const snap = await getDocs(q);
  const ids = new Set<string>();
  snap.forEach((d) => {
    const data = d.data() as { bookId: string };
    if (data.bookId) ids.add(data.bookId);
  });
  return ids;
}

// ── Global Book Search ──────────────────────────────────────────
export interface SearchResult {
  bookId: string;
  title: string;
  author: string;
  coverImageURL: string;
  addedBy: string; // user UID
  addedByUsername: string;
  addedByFullName: string;
  addedByCity: string;
  addedByZipCode: string;
  language?: string;
}

export async function searchAllBooks(title: string, author?: string): Promise<SearchResult[]> {
  // Get books involved in active exchanges to filter them out
  const unavailableIds = await getUnavailableBookIds();
  const usersSnap = await getDocs(collection(db, 'users'));
  if (usersSnap.empty) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>(); // Track (addedBy, bookDocId) to deduplicate by document
  const titleLower = title.toLowerCase().trim();
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    if (!userData || !userDoc.id) continue;

    // Skip duplicate username-based user documents (e.g. "user_bob")
    // Only use the Auth UID-based document (where uid === doc.id)
    if (userData.uid && userData.uid !== userDoc.id) continue;

    // Search this user's books
    const booksSnap = await getDocs(collection(db, 'users', userDoc.id, 'books'));
    for (const bookDoc of booksSnap.docs) {
      const bookData = bookDoc.data();
      if (!bookData) continue;

      // Skip books with active exchanges (lent, pending, borrowed)
      if (unavailableIds.has(bookDoc.id)) { skipped++; continue; }

      const bookTitle = (bookData.title || '').toLowerCase();
      const bookAuthor = (bookData.author || '').toLowerCase();
      const bookCovers = bookData.coverImageURL || '';

      // Match title
      if (!bookTitle.includes(titleLower)) continue;
      // Match author if provided
      if (author && !bookAuthor.includes(author.toLowerCase().trim())) continue;

      const dedupKey = `${userDoc.id}::${bookDoc.id}`;
      if (seen.has(dedupKey)) { skipped++; continue; }
      seen.add(dedupKey);

      results.push({
        bookId: bookDoc.id,
        title: bookData.title,
        author: bookData.author,
        coverImageURL: bookCovers,
        addedBy: userDoc.id,
        addedByUsername: userData.username || '',
        addedByFullName: userData.fullName || '',
        addedByCity: userData.city || '',
        addedByZipCode: userData.zipCode || '',
        language: bookData.language || '',
      });
    }
  }

  // Sort by relevance: exact title match first, then by title, then by author
  results.sort((a, b) => {
    const aExact = a.title.toLowerCase() === titleLower;
    const bExact = b.title.toLowerCase() === titleLower;
    if (aExact && !bExact) return -1;
    if (!aExact && bExact) return 1;
    return a.title.localeCompare(b.title);
  });

  return results;
}

export async function getAllBooks(): Promise<SearchResult[]> {
  // Get books involved in active exchanges to filter them out
  const unavailableIds = await getUnavailableBookIds();
  const usersSnap = await getDocs(collection(db, 'users'));
  if (usersSnap.empty) return [];

  const results: SearchResult[] = [];
  const seen = new Set<string>(); // Track (addedBy, bookDocId) to deduplicate by document
  let skipped = 0;

  for (const userDoc of usersSnap.docs) {
    const userData = userDoc.data();
    if (!userData || !userDoc.id) continue;

    // Skip duplicate username-based user documents (e.g. "user_bob")
    if (userData.uid && userData.uid !== userDoc.id) continue;

    const booksSnap = await getDocs(collection(db, 'users', userDoc.id, 'books'));
    for (const bookDoc of booksSnap.docs) {
      const bookData = bookDoc.data();
      if (!bookData) continue;

      // Skip books with active exchanges (lent, pending, borrowed)
      if (unavailableIds.has(bookDoc.id)) { skipped++; continue; }

      const dedupKey = `${userDoc.id}::${bookDoc.id}`;
      if (seen.has(dedupKey)) { skipped++; continue; }
      seen.add(dedupKey);

      results.push({
        bookId: bookDoc.id,
        title: bookData.title,
        author: bookData.author,
        coverImageURL: bookData.coverImageURL || '',
        addedBy: userDoc.id,
        addedByUsername: userData.username || '',
        addedByFullName: userData.fullName || '',
        addedByCity: userData.city || '',
        addedByZipCode: userData.zipCode || '',
        language: bookData.language || '',
      });
    }
  }

  return results;
}
