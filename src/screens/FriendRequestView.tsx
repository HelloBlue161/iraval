import { useState, useEffect } from 'react';
import { Users, Check, X, MessageSquare, Heart } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  onIncomingRequests,
  onOutgoingRequests,
  onFriends,
  acceptFriendRequest,
  declineFriendRequest,
  getUserById,
} from '../services/firestoreService';
import { useToast } from '../contexts/ToastContext';
import type { FriendRequest, User } from '../types';
import ChatView from './ChatView';

export default function FriendRequestView() {
  const { user } = useAuth();
  const { success: toastSuccess } = useToast();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsubIn = onIncomingRequests(user.uid, (requests) => {
      setIncomingRequests(requests);
    });

    const unsubOut = onOutgoingRequests(user.uid, (requests) => {
      setOutgoingRequests(requests);
    });

    const unsubFriends = onFriends(user.uid, (friendsList) => {
      setFriends(friendsList);
      setLoading(false);
    });

    return () => {
      unsubIn();
      unsubOut();
      unsubFriends();
    };
  }, [user]);

  const handleAccept = async (requestId: string) => {
    await acceptFriendRequest(requestId);
    toastSuccess('Friend request accepted!');
  };

  const handleDecline = async (requestId: string) => {
    await declineFriendRequest(requestId);
  };

  const handleOpenChat = async (senderId: string) => {
    const sender = await getUserById(senderId);
    if (sender) {
      setChatUser(sender);
      setShowChat(true);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-serif text-gray-900">Friends</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your book club community</p>
      </div>

      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 font-serif mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-400" />
            Incoming Requests ({incomingRequests.length})
          </h2>
          <div className="space-y-3">
            {incomingRequests.map((req) => (
              <IncomingRequestCard
                key={req.id}
                request={req}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onChat={handleOpenChat}
              />
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 font-serif mb-3">
            Outgoing Requests ({outgoingRequests.length})
          </h2>
          <div className="space-y-3">
            {outgoingRequests.map((req) => (
              <OutgoingRequestCard key={req.id} request={req} />
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 font-serif mb-3 flex items-center gap-2">
          <Users className="w-5 h-5 text-amber-500" />
          Your Friends ({friends.length})
        </h2>
        {friends.length === 0 ? (
          <div className="text-center py-8 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
            <Users className="w-12 h-12 text-amber-300 mx-auto mb-2" />
            <p className="text-gray-500 font-medium">No friends yet</p>
            <p className="text-sm text-gray-400 mt-1">
              Search for books to find fellow readers
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => {
                  setChatUser(friend);
                  setShowChat(true);
                }}
                className="w-full flex items-center gap-3 p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 hover:border-amber-200 hover:bg-amber-50/50 transition text-left"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-sm font-serif">
                  {(friend.fullName || '??').substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{friend.fullName}</p>
                  <p className="text-sm text-gray-500">{friend.city || 'N/A'}</p>
                </div>
                <MessageSquare className="w-4 h-4 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Chat modal */}
      {showChat && chatUser && user && (
        <ChatView
          recipient={chatUser}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}

function IncomingRequestCard({
  request,
  onAccept,
  onDecline,
  onChat,
}: {
  request: FriendRequest;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  onChat: (uid: string) => void;
}) {
  const [senderName, setSenderName] = useState('');

  useEffect(() => {
    getUserById(request.senderId).then((u) => {
      if (u) setSenderName(u.fullName);
    });
  }, [request.senderId]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-4 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-sm font-serif">
          {senderName ? senderName.substring(0, 2).toUpperCase() : '?'}
        </div>
        <div>
          <p className="font-medium text-gray-900">
            {senderName || 'Loading...'}
          </p>
          <p className="text-sm text-amber-600">wants to be your book friend</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(request.id)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2 rounded-xl text-sm font-medium hover:from-green-600 hover:to-emerald-600 transition"
        >
          <Check className="w-4 h-4" />
          Accept
        </button>
        <button
          onClick={() => onDecline(request.id)}
          className="flex-1 flex items-center justify-center gap-1.5 bg-gray-200 text-gray-700 py-2 rounded-xl text-sm font-medium hover:bg-gray-300 transition"
        >
          <X className="w-4 h-4" />
          Decline
        </button>
        <button
          onClick={() => onChat(request.senderId)}
          className="p-2 bg-amber-100 text-amber-600 rounded-xl hover:bg-amber-200 transition"
        >
          <MessageSquare className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function OutgoingRequestCard({ request }: { request: FriendRequest }) {
  const [receiverName, setReceiverName] = useState('');

  useEffect(() => {
    getUserById(request.receiverId).then((u) => {
      if (u) setReceiverName(u.fullName);
    });
  }, [request.receiverId]);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-4 flex items-center gap-3 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-200 to-amber-200 flex items-center justify-center text-orange-700 font-bold text-sm font-serif">
        {receiverName ? receiverName.substring(0, 2).toUpperCase() : '?'}
      </div>
      <div className="flex-1">
        <p className="font-medium text-gray-900">{receiverName || 'Loading...'}</p>
        <p className="text-sm text-amber-600 flex items-center gap-1">
          <Heart className="w-3 h-3" />
          Request pending...
        </p>
      </div>
    </div>
  );
}
