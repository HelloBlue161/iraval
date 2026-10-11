import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Tag } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserById, searchReadersWithBook, getAcceptedFriends } from '../services/firestoreService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { User, Book } from '../types';
import type { SearchResult } from '../services/firestoreService';
import UserProfileView from './UserProfileView';

/**
 * Dedicated page for a book found in search: book details plus the list
 * of readers holding a copy. Tapping a reader opens their profile, from
 * which you message them — borrowing starts from the chat.
 */
export default function BookDetailView() {
  const { ownerUid, bookId } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const [book, setBook] = useState<(Book & { id: string }) | null>(null);
  const [owner, setOwner] = useState<User | null>(null);
  const [readers, setReaders] = useState<Array<{ user: User; book: SearchResult }>>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set());
  const [selectedReader, setSelectedReader] = useState<{ user: User; book: SearchResult } | null>(null);

  useEffect(() => {
    if (!ownerUid || !bookId) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const bookSnap = await getDoc(doc(db, 'users', ownerUid, 'books', bookId));
        if (!bookSnap.exists()) {
          setNotFound(true);
          return;
        }
        const bookData = { id: bookSnap.id, ...(bookSnap.data() as Omit<Book, 'id'>) };
        setBook(bookData);
        const [ownerData, readersData, friends] = await Promise.all([
          getUserById(ownerUid),
          searchReadersWithBook(bookData.title, currentUser?.uid),
          currentUser ? getAcceptedFriends(currentUser.uid) : Promise.resolve([] as User[]),
        ]);
        setOwner(ownerData);
        setReaders(readersData);
        setFriendIds(new Set(friends.map((f) => f.id)));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [ownerUid, bookId, currentUser?.uid]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (notFound || !book) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <p className="text-gray-500 font-medium">Book not found</p>
        <button onClick={() => navigate('/search')} className="text-amber-600 text-sm mt-2">
          Back to search
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate('/search')}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-amber-600 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to search
      </button>

      {/* Book header */}
      <div className="flex gap-4 mb-6 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-4">
        {book.coverImageURL ? (
          <img src={book.coverImageURL} alt={book.title} className="w-20 h-28 object-cover rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-20 h-28 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Tag className="w-8 h-8 text-amber-600" />
          </div>
        )}
        <div className="min-w-0">
          <h1 className="text-xl font-bold font-serif text-gray-900">{book.title}</h1>
          <p className="text-sm text-gray-500">{book.author || 'Unknown'}</p>
          {book.language && <p className="text-xs text-gray-400 mt-1">{book.language}</p>}
          {owner && (
            <p className="text-xs text-amber-600 mt-1">@{owner.username || owner.fullName}</p>
          )}
        </div>
      </div>

      {/* Readers */}
      <h2 className="text-lg font-bold font-serif text-gray-900 mb-3">
        Readers with this book ({readers.length})
      </h2>
      {readers.length === 0 ? (
        <p className="text-gray-500 text-center py-8 bg-white/80 rounded-xl border border-amber-100">
          No readers found with an available copy right now
        </p>
      ) : (
        <div className="space-y-2">
          {readers.map(({ user, book: readerBook }) => {
            const isFriend = friendIds.has(user.id);
            return (
              <button
                key={user.id}
                onClick={() => setSelectedReader({ user, book: readerBook })}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-amber-50 transition text-left border border-gray-100 hover:border-amber-200 bg-white/80"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-sm font-serif">
                  {(user.username || user.fullName || '??').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">@{user.username || user.fullName}</p>
                    {isFriend && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">Friend</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{user.city || 'N/A'}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-4 text-center">
        Tap a reader to view their profile and send them a message
      </p>

      {/* Reader profile modal */}
      {selectedReader && (
        <UserProfileView
          user={selectedReader.user}
          book={selectedReader.book}
          onClose={() => setSelectedReader(null)}
        />
      )}
    </div>
  );
}
