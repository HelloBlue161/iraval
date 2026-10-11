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
  increment,
  deleteField,
  writeBatch,
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
  const q = query(
    collection(db, 'users', uid, 'books'),
    orderBy('addedAt', 'desc')
  );
  return onSnapshot(q, async (snap) => {
    const books: Book[] = [];

    // Load all exchanges for this user (both directions)
    const q1 = query(collection(db, 'exchanges'), where('senderId', '==', uid));
    const q2 = query(collection(db, 'exchanges'), where('receiverId', '==', uid));
    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);

    // Map bookId → exchange status (for sender-side matching)
    const bookExchanges: Record<string, { status: string; isSender: boolean }> = {};
    for (const d of snap1.docs) {
      const data = d.data() as { bookId: string; status: string; bookTitle?: string };
      bookExchanges[data.bookId] = { status: data.status, isSender: true };
    }
    for (const d of snap2.docs) {
      const data = d.data() as { bookId: string; status: string; bookTitle?: string };
      bookExchanges[data.bookId] = { status: data.status, isSender: false };
    }

    // Build title → bookId index for fallback matching
    // (when a user is receiver, the exchange bookId points to the sender's book,
    //  so we match by bookTitle instead)
    const titleIndex: Record<string, string> = {};
    snap.forEach((docSnap) => {
      const data = docSnap.data() as Omit<Book, 'id'>;
      const title = (data.title || '').toLowerCase().trim();
      if (title) titleIndex[title] = docSnap.id;
    });

    // Debug: log exchanges for badge matching
    if (import.meta.env.DEV) {
      console.log('onUserBooks:', uid, 'exchanges:', Object.keys(bookExchanges));
    }

    snap.forEach((docSnap) => {
      const bookData = docSnap.data() as Omit<Book, 'id'>;
      const bookTitle = (bookData.title || '').toLowerCase().trim();
      const docId = docSnap.id;

      // Primary match: bookId matches document ID
      const directExchange = bookExchanges[docId];

      // Fallback match: exchange bookTitle matches this book's title
      // (handles receiver-side exchanges where bookId = sender's book ID)
      let fallbackExchange: { status: string; isSender: boolean } | undefined;
      if (bookTitle && !directExchange) {
        const fallbackDocId = titleIndex[bookTitle];
        if (fallbackDocId) {
          fallbackExchange = bookExchanges[fallbackDocId];
        }
      }

      const exchange = directExchange || fallbackExchange;
      let bookStatus: Book['bookStatus'] = 'available';
      if (exchange) {
        if (exchange.status === 'accepted') {
          bookStatus = exchange.isSender ? 'borrowed' : 'lent';
        } else if (exchange.status === 'pending') {
          bookStatus = 'pending_exchange';
        }
      }
      books.push({ ...bookData, id: docId, bookStatus });
    });
    callback(books);
  });
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
  });
}

export async function sendMessage(
  chatId: string,
  senderId: string,
  text: string
): Promise<void> {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  // Participants are encoded in the chat id (chat_{uid1}_{uid2}, uids sorted);
  // Firebase Auth UIDs are alphanumeric, so splitting on "_" is safe.
  // The participants array is denormalized onto every message so the
  // security rules can authorize reads without extra lookups.
  const participants = chatId.replace(/^chat_/, '').split('_').filter(Boolean);
  const message: Omit<Message, 'id'> = {
    chatId,
    senderId,
    text,
    timestamp: new Date(),
  };
  await setDoc(doc(db, 'chats', chatId, 'messages', messageId), {
    ...message,
    participants,
  });
  // Track unread counts per participant: everyone except the sender gains
  // one unread; the sender's own count resets (they just read the thread
  // by writing in it). Built as an explicit nested map: setDoc with
  // {merge:true} does NOT expand dotted keys into field paths.
  const unreadBy: Record<string, unknown> = {};
  for (const p of participants) {
    unreadBy[p] = p === senderId ? 0 : increment(1);
  }
  await setDoc(
    doc(db, 'chats', chatId),
    {
      participants,
      lastMessage: text,
      lastMessageTime: serverTimestamp(),
      updatedAt: serverTimestamp(),
      unreadBy,
    },
    { merge: true }
  );
}

/** Clear the unread count for a user (call when they open the chat). */
export async function markChatAsRead(chatId: string, uid: string): Promise<void> {
  await setDoc(
    doc(db, 'chats', chatId),
    { unreadBy: { [uid]: 0 } },
    { merge: true }
  );
}

/**
 * Delete a conversation: removes all its messages plus the parent chat doc.
 * Rules already let any participant delete these. The thread is shared, so
 * it disappears for both sides; if either person messages again later,
 * a fresh thread is created automatically.
 */
export async function deleteChat(chatId: string): Promise<void> {
  const msgsSnap = await getDocs(collection(db, 'chats', chatId, 'messages'));
  // Delete in chunks to stay under the 500-op batch limit
  const docs = msgsSnap.docs;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = writeBatch(db);
    docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    batch.delete(doc(db, 'chats', chatId));
    await batch.commit();
  }
  if (docs.length === 0) {
    await deleteDoc(doc(db, 'chats', chatId));
  }
}

/** Realtime total unread chat messages for the navbar badge. */
export function onUnreadChatCount(
  uid: string,
  callback: (total: number) => void
): Unsubscribe {
  const q = query(
    collection(db, 'chats'),
    where('participants', 'array-contains', uid)
  );
  return onSnapshot(
    q,
    (snap) => {
      let total = 0;
      snap.forEach((d) => {
        total += (d.data().unreadBy?.[uid] as number) || 0;
      });
      callback(total);
    },
    () => callback(0)
  );
}

// ── Chat List (all conversations the user participated in) ─────

export interface UserChat {
  chatId: string;
  otherUserId: string;
  otherUserName: string;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount: number;
}

export async function getUserChats(uid: string): Promise<UserChat[]> {
  // Indexed query: only chats the user participates in. The parent chat
  // document is maintained by sendMessage(); chats created before that
  // change have no parent doc and won't appear until a new message is sent.
  const chatsRef = collection(db, 'chats');
  const q = query(chatsRef, where('participants', 'array-contains', uid));
  const snap = await getDocs(q);

  const result: UserChat[] = [];

  for (const chatDoc of snap.docs) {
    const chatId = chatDoc.id;
    const data = chatDoc.data();
    const participants: string[] = Array.isArray(data.participants) ? data.participants : [];

    // Determine the other user's ID
    const otherUserId = participants.find((p) => p !== uid) || '';

    // Last message is denormalized on the parent doc by sendMessage()
    const lastMessage: string | undefined = data.lastMessage;
    const lastMessageTime: Date | undefined = data.lastMessageTime?.toDate?.();

    // Fetch other user's name
    let otherName = 'Unknown';
    if (otherUserId) {
      const otherSnap = await getDoc(doc(db, 'users', otherUserId));
      if (otherSnap.exists()) {
        otherName = otherSnap.data().fullName || 'Unknown';
      }
    }

    result.push({ chatId, otherUserId, otherUserName: otherName, lastMessage, lastMessageTime, unreadCount: (data.unreadBy?.[uid] as number) || 0 });
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
  bookLanguage?: string;
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
  if (exchange.bookLanguage) {
    data.bookLanguage = exchange.bookLanguage;
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

// Check if a book has any active exchange involving a specific user
export async function isBookUnavailable(bookId: string, userId: string): Promise<boolean> {
  // Check if the user is involved in any active exchange for this book (as sender OR receiver)
  // Note: We check by bookId field in exchanges, but also fallback to checking all exchanges for this user
  const q = query(
    collection(db, 'exchanges'),
    where('status', 'in', ['pending', 'accepted'] as const),
    where('senderId', '==', userId)
  );
  const snap = await getDocs(q);
  
  // Check if any of the user's pending/accepted exchanges match this bookId
  for (const doc of snap.docs) {
    const data = doc.data();
    if ((data as { bookId?: string }).bookId === bookId) {
      return true;
    }
  }
  return false;
}

export function onUserExchanges(
  uid: string,
  callback: (exchanges: Exchange[]) => void
): Unsubscribe {
  const q1 = query(collection(db, 'exchanges'), where('senderId', '==', uid));
  const q2 = query(collection(db, 'exchanges'), where('receiverId', '==', uid));

  // Track exchanges by id so updates merge instead of duplicating
  const exchangeMap = new Map<string, Exchange>();
  // Track which query each exchange currently belongs to, so an exchange
  // disappearing from one query's snapshot is NOT removed while it still
  // exists in the other query's results.
  const inQ1 = new Set<string>(); // user is sender
  const inQ2 = new Set<string>(); // user is receiver

  const emit = () => callback(Array.from(exchangeMap.values()));

  const processSnap = (
    snap: import('firebase/firestore').QuerySnapshot,
    mine: Set<string>
  ) => {
    const currentIds = new Set<string>();
    snap.forEach((d) => {
      currentIds.add(d.id);
      mine.add(d.id);
      // Add new or refresh existing with the latest data
      exchangeMap.set(d.id, { id: d.id, ...(d.data() as Omit<Exchange, 'id'>) });
    });

    // Drop ids that left THIS query. Only remove from the map when the
    // exchange is in neither query anymore.
    for (const id of [...mine]) {
      if (!currentIds.has(id)) {
        mine.delete(id);
        if (!inQ1.has(id) && !inQ2.has(id)) {
          exchangeMap.delete(id);
        }
      }
    }
    emit();
  };

  const unsub1 = onSnapshot(q1, (snap) => {
    processSnap(snap, inQ1);
  });

  const unsub2 = onSnapshot(q2, (snap) => {
    processSnap(snap, inQ2);
  });

  return () => { unsub1(); unsub2(); };
}

export async function acceptExchange(exchangeId: string): Promise<void> {
  const exRef = doc(db, 'exchanges', exchangeId);
  const exSnap = await getDoc(exRef);
  if (!exSnap.exists()) throw new Error('Exchange not found');
  const data = exSnap.data() as { bookId?: string; receiverId?: string; senderId?: string };
  await updateDoc(exRef, {
    status: 'accepted',
    respondedAt: new Date(),
  });
  // Mark the owner's copy as lent so it shows a badge in their library.
  // The receiver is the owner, and owners can write their own book docs.
  if (data.bookId && data.receiverId) {
    try {
      await updateDoc(doc(db, 'users', data.receiverId, 'books', data.bookId), {
        bookStatus: 'lent',
        lentTo: data.senderId,
      });
    } catch {
      // Book doc missing (legacy id scheme) — the exchange still records it.
    }
  }
}

export async function declineExchange(exchangeId: string, note?: string): Promise<void> {
  await updateDoc(doc(db, 'exchanges', exchangeId), {
    status: 'declined',
    respondedAt: new Date(),
    ...(note ? { declineNote: note } : {}),
  });
}

/**
 * Delete an exchange record. Only terminal states (returned/declined/expired)
 * may be deleted — the UI enforces this, since active exchanges drive book
 * availability, badges, and lent status.
 */
export async function deleteExchange(exchangeId: string): Promise<void> {
  await deleteDoc(doc(db, 'exchanges', exchangeId));
}

/**
 * Borrower hands the book back: marks the exchange as return-requested.
 * The book stays 'lent' until the owner confirms receipt.
 */
export async function requestReturn(exchangeId: string): Promise<void> {
  await updateDoc(doc(db, 'exchanges', exchangeId), {
    status: 'return_requested',
    returnRequestedAt: new Date(),
  });
}

/**
 * Owner confirms the book is back: exchange closes and the book
 * becomes available in the owner's library again.
 */
export async function confirmReturn(exchangeId: string): Promise<void> {
  const exRef = doc(db, 'exchanges', exchangeId);
  const exSnap = await getDoc(exRef);
  if (!exSnap.exists()) throw new Error('Exchange not found');
  const data = exSnap.data() as { bookId?: string; receiverId?: string };
  await updateDoc(exRef, {
    status: 'returned',
    returnedAt: new Date(),
  });
  // Book goes back to available in the owner's library.
  if (data.bookId && data.receiverId) {
    try {
      await updateDoc(doc(db, 'users', data.receiverId, 'books', data.bookId), {
        bookStatus: 'available',
        lentTo: deleteField(),
      });
    } catch {
      // Book doc missing (legacy id scheme) — the exchange still records it.
    }
  }
}

// ── Helpers for filtering unavailable books ─────────────────────

// Returns a Set of bookIds that have any pending, accepted, or
// return-requested exchange (the book is still out in all three cases)
async function getUnavailableBookIds(): Promise<Set<string>> {
  const q = query(collection(db, 'exchanges'), where('status', 'in', ['pending', 'accepted', 'return_requested'] as const));
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

// Fetch borrowed books for a user (books they've accepted to borrow)
export function onBorrowedBooks(
  uid: string,
  callback: (books: Book[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'exchanges'),
    where('senderId', '==', uid),
    where('status', 'in', ['accepted', 'return_requested'] as const)
  );
  
  const borrowedBooks: Book[] = [];
  const seenBookIds = new Set<string>();
  
  const unsub = onSnapshot(q, async (snap) => {
    borrowedBooks.length = 0;
    seenBookIds.clear();
    
    const promises = snap.docs.map(async (doc) => {
      const data = doc.data();
      const bookId = data.bookId;
      if (seenBookIds.has(bookId)) return;
      seenBookIds.add(bookId);
      
      // Use the exchange data for borrowed book info
      borrowedBooks.push({
        id: bookId,
        title: data.bookTitle,
        author: data.bookAuthor || 'Unknown',
        addedBy: data.receiverId,
        addedAt: data.requestedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        coverImageURL: data.bookCoverImageURL || '',
        language: data.bookLanguage || '',
        bookStatus: 'borrowed' as const,
      });
    });
    
    await Promise.all(promises);
    callback([...borrowedBooks]);
  });
  
  return unsub;
}
