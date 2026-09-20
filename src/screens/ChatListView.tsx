import { useState, useEffect } from 'react';
import { MessageSquare, Feather } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserChats, getUserById } from '../services/firestoreService';
import type { User } from '../types';
import type { UserChat } from '../services/firestoreService';
import ChatView from './ChatView';

export default function ChatListView() {
  const { user } = useAuth();
  const [chats, setChats] = useState<UserChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadChats = async () => {
      const chatList = await getUserChats(user.uid);
      setChats(chatList);
      setLoading(false);
    };
    loadChats();
  }, [user]);

  const openChat = async (chat: UserChat) => {
    const u = await getUserById(chat.otherUserId);
    if (u) {
      setChatUser(u);
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
        <h1 className="text-2xl font-bold font-serif text-gray-900">Chats</h1>
        <p className="text-sm text-gray-500 mt-0.5">Message your fellow readers</p>
      </div>

      {chats.length === 0 ? (
        <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
          <Feather className="w-16 h-16 text-amber-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">No chats yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Search for books and find readers to chat with
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((chat) => (
            <button
              key={chat.chatId}
              onClick={() => openChat(chat)}
              className="w-full flex items-center gap-3 p-4 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 hover:border-amber-200 hover:bg-amber-50/50 transition text-left"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold font-serif">
                {(chat.otherUserName || '??').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900">{chat.otherUserName}</p>
                <p className="text-sm text-gray-500 truncate">
                  {chat.lastMessage || 'No messages yet'}
                </p>
              </div>
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showChat && chatUser && user && (
        <ChatView
          recipient={chatUser}
          onClose={() => setShowChat(false)}
        />
      )}
    </div>
  );
}
