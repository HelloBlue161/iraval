import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MessageSquare, UserPlus, UserCheck, Tag, Loader2 } from 'lucide-react';
import type { User, FriendRequestStatus } from '../types';
import type { SearchResult } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendFriendRequest, sendExchangeRequest, checkPendingExchange } from '../services/firestoreService';
import { getDocs, query, where, collection } from 'firebase/firestore';
import { db } from '../services/firebase';

interface UserProfileViewProps {
  user: User;
  book: SearchResult | null;
  onClose: () => void;
}

export default function UserProfileView({ user, book, onClose }: UserProfileViewProps) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const { info: toastInfo, error: toastError } = useToast();
  const [friendshipStatus, setFriendshipStatus] = useState<FriendRequestStatus>('none');
  const [statusLoading, setStatusLoading] = useState(true);
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [requestSent, setRequestSent] = useState(false);

  // If a borrow request is already pending for this book, show that state
  // instead of the request button.
  useEffect(() => {
    if (!currentUser || !book) {
      setRequestSent(false);
      return;
    }
    checkPendingExchange(currentUser.uid, user.id, book.title).then(setRequestSent);
  }, [currentUser?.uid, user.id, book?.title]);

  const openChat = () => {
    const params = new URLSearchParams({ with: user.id });
    if (book) {
      params.set('book', book.bookId);
      params.set('title', book.title);
    }
    onClose();
    navigate(`/chats?${params.toString()}`);
  };

  // One inbox: conversations live in the Chats tab.
  const handleSendMessage = () => {
    openChat();
  };

  // Request first, chat follows: the request lands in the conversation as
  // a pending card with Accept/Decline for the owner.
  const handleRequestBorrow = async () => {
    if (!currentUser || !book || requesting) return;
    setRequesting(true);
    try {
      await sendExchangeRequest({
        bookId: book.bookId,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookCoverImageURL: book.coverImageURL,
        bookLanguage: book.language,
        senderId: currentUser.uid,
        receiverId: user.id,
      });
      toastInfo('Borrow request sent!');
      setRequestSent(true);
      openChat();
    } catch {
      toastError('Failed to send borrow request.');
    } finally {
      setRequesting(false);
    }
  };

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

        {/* Actions — request first, chat follows. The request lands in the
            chat as a pending card with Accept/Decline for the owner. */}
        <div className="space-y-3">
          {book && !requestSent && (
            <button
              onClick={handleRequestBorrow}
              disabled={requesting}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200 disabled:opacity-50"
            >
              <Tag className="w-4 h-4" />
              {requesting ? 'Sending…' : 'Request to Borrow'}
            </button>
          )}
          {book && requestSent && (
            <div className="w-full flex items-center justify-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 py-3 rounded-xl font-medium text-sm">
              <Tag className="w-4 h-4" />
              Request sent — waiting for the owner
            </div>
          )}
          <button
            onClick={handleSendMessage}
            className="w-full text-sm text-amber-600 hover:text-amber-700 font-medium py-1 transition"
          >
            <span className="inline-flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Send a message instead
            </span>
          </button>
          <p className="text-xs text-gray-400 text-center">Requesting opens a chat so you can coordinate pickup</p>

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
    </div>
  );
}
