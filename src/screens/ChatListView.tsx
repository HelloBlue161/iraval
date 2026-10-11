import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MessageSquare, Feather } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserChats, getUserById } from '../services/firestoreService';
import type { User } from '../types';
import type { UserChat } from '../services/firestoreService';
import MyExchangesView from './MyExchangesView';
import ChatView from './ChatView';

export interface ChatContextBook {
  id: string;
  title: string;
}

export default function ChatListView() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [chats, setChats] = useState<UserChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [chatUser, setChatUser] = useState<User | null>(null);
  const [contextBook, setContextBook] = useState<ChatContextBook | null>(null);

  useEffect(() => {
    if (!user) return;
    const loadChats = async () => {
      const chatList = await getUserChats(user.uid);
      setChats(chatList);
      setLoading(false);
    };
    loadChats();
  }, [user]);

  // Deep link from Exchanges or a user profile: open the conversation directly.
  // Runs on param changes too, in case we're already on /chats.
  useEffect(() => {
    if (!user || loading) return;
    const withUid = searchParams.get('with');
    if (!withUid || showChat) return;
    getUserById(withUid).then((u) => {
      if (!u) return;
      setChatUser(u);
      const bookId = searchParams.get('book');
      const title = searchParams.get('title');
      setContextBook(bookId && title ? { id: bookId, title } : null);
      setShowChat(true);
      // Consume the params so a refresh doesn't reopen the chat unexpectedly.
      setSearchParams({}, { replace: true });
    });
  }, [user, loading, searchParams, showChat, setSearchParams]);

  const openChat = async (chat: UserChat) => {
    const u = await getUserById(chat.otherUserId);
    if (u) {
      setChatUser(u);
      setShowChat(true);
    }
  };

  const closeChat = async () => {
    setShowChat(false);
    setContextBook(null);
    // Refresh so the unread badge clears after reading
    if (user) {
      const chatList = await getUserChats(user.uid);
      setChats(chatList);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // One door: the inbox hosts both conversations and exchange requests.
  // Deep links can select the tab (?tab=requests) or open a chat (?with=).
  const activeTab = searchParams.get('tab') === 'requests' ? 'requests' : 'chats';
  const setActiveTab = (tab: 'chats' | 'requests') => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'requests') next.set('tab', 'requests');
    else next.delete('tab');
    setSearchParams(next, { replace: true });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold font-serif text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500 mt-0.5">Conversations and borrow requests in one place</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white/80 backdrop-blur-sm border border-amber-100 rounded-xl p-1">
        {(['chats', 'requests'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === tab
                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'chats' ? 'Chats' : 'Requests'}
          </button>
        ))}
      </div>

      {activeTab === 'requests' ? (
        <MyExchangesView />
      ) : chats.length === 0 ? (
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
              {chat.unreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-5 h-5 px-1 flex items-center justify-center flex-shrink-0">
                  {chat.unreadCount > 9 ? '9+' : chat.unreadCount}
                </span>
              )}
              <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0" />
            </button>
          ))}
        </div>
      )}

      {showChat && chatUser && user && (
        <ChatView
          recipient={chatUser}
          contextBook={contextBook}
          onClose={closeChat}
        />
      )}
    </div>
  );
}
