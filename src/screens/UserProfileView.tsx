import { useState, useEffect } from 'react';
import { X, MessageSquare, UserPlus, UserCheck, Tag, Loader2 } from 'lucide-react';
import type { User, FriendRequestStatus } from '../types';
import type { SearchResult } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendFriendRequest, checkPendingExchange, isBookUnavailable } from '../services/firestoreService';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import ChatView from './ChatView';
import ExchangeRequestView from './ExchangeRequestView';

interface UserProfileViewProps {
  user: User;
  book: SearchResult | null;
  onClose: () => void;
}

export default function UserProfileView({ user, book, onClose }: UserProfileViewProps) {
  const { user: currentUser } = useAuth();
  const { info: toastInfo } = useToast();
  const [friendshipStatus, setFriendshipStatus] = useState<FriendRequestStatus>('none');
  const [statusLoading, setStatusLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showExchange, setShowExchange] = useState(false);
  const [pendingExchange, setPendingExchange] = useState(false);
  const [bookUnavailable, setBookUnavailable] = useState(false);

  useEffect(() => {
    if (!currentUser || !book) { setPendingExchange(false); return; }
    checkPendingExchange(currentUser.uid, user.id, book.title).then((hasPending) => {
      setPendingExchange(hasPending);
    });
    // Also check if the book itself is unavailable (lent/pending to anyone)
    isBookUnavailable(book.bookId, user.id).then((unavailable) => {
      setBookUnavailable(unavailable);
    });
  }, [currentUser?.uid, user.id, book?.bookId, book?.title]);

  useEffect(() => {
    if (!currentUser) { setStatusLoading(false); return; }

    setStatusLoading(true);
    const checkFriendship = async () => {
      try {
        const acceptedQ1 = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', user.id),
          where('status', '==', 'accepted'),
        );
        const acceptedQ2 = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', user.id),
          where('receiverId', '==', currentUser.uid),
          where('status', '==', 'accepted'),
        );

        const pendingQ1 = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', currentUser.uid),
          where('receiverId', '==', user.id),
          where('status', '==', 'pending'),
        );
        const pendingQ2 = query(
          collection(db, 'friendRequests'),
          where('senderId', '==', user.id),
          where('receiverId', '==', currentUser.uid),
          where('status', '==', 'pending'),
        );

        const [acc1, acc2, pend1, pend2] = await Promise.all([
          getDocs(acceptedQ1),
          getDocs(acceptedQ2),
          getDocs(pendingQ1),
          getDocs(pendingQ2),
        ]);


        if (!acc1.empty || !acc2.empty) {
          setFriendshipStatus('accepted');
        } else if (!pend1.empty || !pend2.empty) {
          setFriendshipStatus('pending');
        } else {
          setFriendshipStatus('none');
        }
      } catch (err) {
        console.error('Failed to check friendship:', err);
        setFriendshipStatus('none');
      } finally {
        setStatusLoading(false);
      }
    };

    checkFriendship();
  }, [currentUser, user.id]);

  const handleSendFriendRequest = async () => {
    if (!currentUser || friendshipStatus !== 'none') return;
    setSendingRequest(true);
    try {
      await sendFriendRequest(currentUser.uid, user.id);
      setFriendshipStatus('pending');
      toastInfo('Friend request sent!');
    } catch {
      // Error handling
    } finally {
      setSendingRequest(false);
    }
  };

  const initials = (user.fullName || '??').substring(0, 2).toUpperCase();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-amber-100 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold font-serif text-gray-900">Reader Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <span className="text-amber-700 font-bold text-lg font-serif">{initials}</span>
          </div>
          <h3 className="text-xl font-bold text-gray-900 font-serif">{user.fullName}</h3>
          <p className="text-sm text-gray-500">{user.email}</p>
          <p className="text-sm text-amber-600 font-medium">{user.city || 'N/A'}</p>
          {user.zipCode && user.zipCode !== 'Unknown' && (
            <p className="text-xs text-gray-400 mt-1">Zip: {user.zipCode}</p>
          )}
        </div>

        {book && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-3 mb-4 border border-amber-100">
            <p className="text-sm text-amber-800 font-medium flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              Book: {book.title || 'Unknown'}
            </p>
            <p className="text-xs text-amber-600">{book.author || 'Unknown'}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setShowChat(true)}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200"
          >
            <MessageSquare className="w-4 h-4" />
            Send Message
          </button>
          <p className="text-xs text-gray-400 text-center">Ask questions about the book, share availability, or chat freely</p>

          {book && (
            <div>
              {bookUnavailable ? (
                <div className="w-full flex items-center justify-center gap-2 bg-gray-100 border-2 border-gray-200 text-gray-500 py-3 rounded-xl font-medium">
                  <Tag className="w-4 h-4" />
                  This Book is Currently Unavailable
                </div>
              ) : pendingExchange ? (
                <div className="w-full flex items-center justify-center gap-2 bg-amber-100 border-2 border-amber-200 text-amber-700 py-3 rounded-xl font-medium">
                  <Tag className="w-4 h-4" />
                  Request to Borrow Already Sent
                </div>
              ) : (
                <button
                  onClick={() => setShowExchange(true)}
                  className="w-full flex items-center justify-center gap-2 bg-white border-2 border-amber-300 text-amber-700 py-3 rounded-xl font-medium hover:bg-amber-50 transition"
                >
                  <Tag className="w-4 h-4" />
                  Request to Borrow
                </button>
              )}
              <p className="text-xs text-gray-400 text-center mt-1">
                {bookUnavailable ? 'This book is involved in an active exchange' : pendingExchange ? 'Waiting for the owner to respond' : 'Formal borrow request — the owner must accept before you can borrow'}
              </p>
            </div>
          )}

          <button
            onClick={handleSendFriendRequest}
            disabled={sendingRequest || friendshipStatus === 'accepted' || statusLoading}
            className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 text-gray-700 py-2.5 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            {statusLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Checking...
              </>
            ) : friendshipStatus === 'pending' ? (
              <>
                <UserCheck className="w-4 h-4" />
                Request Sent
              </>
            ) : friendshipStatus === 'accepted' ? (
              <>
                <UserCheck className="w-4 h-4" />
                Already Friends
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                Add to Friends
              </>
            )}
          </button>

          {friendshipStatus === 'pending' && (
            <p className="text-center text-sm text-amber-600">Friend request sent!</p>
          )}
          {friendshipStatus === 'accepted' && (
            <p className="text-center text-sm text-green-600">You are friends!</p>
          )}
        </div>
      </div>

      {/* Chat modal */}
      {showChat && currentUser && (
        <ChatView
          recipient={user}
          onClose={() => setShowChat(false)}
        />
      )}

      {/* Exchange request modal */}
      {showExchange && book && (
        <ExchangeRequestView
          recipient={user}
          book={book}
          onClose={() => setShowExchange(false)}
        />
      )}
    </div>
  );
}
