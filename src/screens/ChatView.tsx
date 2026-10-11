import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Send, Feather, Tag, Trash2 } from 'lucide-react';
import type { Message } from '../types';
import type { Exchange } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getChatId, onChatMessages, sendMessage as sendMsg, markChatAsRead, onUserExchanges, getUserById, deleteChat } from '../services/firestoreService';
import ExchangeRequestView from './ExchangeRequestView';
import type { SearchResult } from '../services/firestoreService';
import type { User } from '../types';

export interface ChatContextBook {
  id: string;
  title: string;
}

interface ChatViewProps {
  recipient: { id: string; fullName: string };
  contextBook?: ChatContextBook | null;
  onClose: () => void;
}

export default function ChatView({ recipient, contextBook, onClose }: ChatViewProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [showRequest, setShowRequest] = useState(false);
  const [requestRecipient, setRequestRecipient] = useState<User | null>(null);
  const [pendingExchanges, setPendingExchanges] = useState<Exchange[]>([]);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = user ? getChatId(user.uid, recipient.id) : '';

  useEffect(() => {
    if (!chatId || !user) return;
    // Opening the chat means reading it: clear our unread count, and keep
    // it clear as new incoming messages arrive while we're viewing.
    markChatAsRead(chatId, user.uid).catch(() => {});
    return onChatMessages(chatId, (msgs) => {
      setMessages(msgs);
      if (msgs.length > 0 && msgs[msgs.length - 1].senderId !== user.uid) {
        markChatAsRead(chatId, user.uid).catch(() => {});
      }
    });
  }, [chatId, user]);

  // Pending borrow requests between this pair — surfaced here so nothing
  // gets lost; accept/decline lives in the Exchanges tracker.
  useEffect(() => {
    if (!user) return;
    return onUserExchanges(user.uid, (exs) => {
      setPendingExchanges(
        exs.filter(
          (ex) =>
            ex.status === 'pending' &&
            ((ex.senderId === user.uid && ex.receiverId === recipient.id) ||
              (ex.senderId === recipient.id && ex.receiverId === user.uid))
        )
      );
    });
  }, [user, recipient.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleDeleteChat = async () => {
    if (!chatId) return;
    setDeleting(true);
    try {
      await deleteChat(chatId);
      onClose();
    } catch {
      setDeleting(false);
      setConfirmingDelete(false);
    }
  };

  const handleRequestBook = async () => {
    // ExchangeRequestView needs the full user record
    const u = await getUserById(recipient.id);
    if (u) {
      setRequestRecipient(u);
      setShowRequest(true);
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;
    await sendMsg(chatId, user.uid, newMessage.trim());
    setNewMessage('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!user) return null;

  const requestBook: SearchResult | null = contextBook
    ? {
        bookId: contextBook.id,
        title: contextBook.title,
        author: '',
        coverImageURL: '',
        addedBy: recipient.id,
        addedByUsername: '',
        addedByFullName: recipient.fullName,
        addedByCity: '',
        addedByZipCode: '',
      }
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[80vh] border border-amber-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-xs font-serif flex-shrink-0">
              {(recipient.fullName || '??').substring(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <span className="font-medium text-gray-900 font-serif block truncate">{recipient.fullName || 'Unknown'}</span>
              {contextBook && (
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full mt-0.5 max-w-full">
                  <Tag className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">About: {contextBook.title}</span>
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {requestBook && (
              <button
                onClick={handleRequestBook}
                className="text-xs font-medium text-amber-700 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition"
              >
                Request Book
              </button>
            )}
            <button
              onClick={() => setConfirmingDelete(true)}
              className="text-gray-400 hover:text-red-600 transition"
              title="Delete conversation"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Delete confirmation */}
        {confirmingDelete && (
          <div className="mx-3 mt-2 flex items-center gap-2 text-xs bg-red-50 border border-red-200 rounded-xl px-3 py-2">
            <span className="flex-1 text-red-700">Delete this conversation for both of you?</span>
            <button
              onClick={handleDeleteChat}
              disabled={deleting}
              className="font-medium text-red-700 hover:text-red-900 disabled:opacity-50"
            >
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              disabled={deleting}
              className="font-medium text-gray-500 hover:text-gray-700"
            >
              Keep
            </button>
          </div>
        )}

        {/* Pending exchange banner */}
        {pendingExchanges.length > 0 && (
          <button
            onClick={() => {
              onClose();
              navigate('/chats?tab=requests');
            }}
            className="mx-3 mt-2 flex items-center gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 hover:bg-amber-100 transition text-left"
          >
            <Tag className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              {pendingExchanges.length === 1
                ? `Borrow request pending: ${pendingExchanges[0].bookTitle || 'a book'} — tap to review`
                : `${pendingExchanges.length} borrow requests pending — tap to review`}
            </span>
          </button>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2" style={{ background: 'linear-gradient(to bottom, #fffbeb, #fff)' }}>
          {messages.length === 0 && (
            <div className="text-center py-12">
              <Feather className="w-10 h-10 text-amber-300 mx-auto mb-2" />
              <p className="text-gray-400 text-sm">Start a conversation</p>
              <p className="text-gray-300 text-xs mt-0.5">Send a note to your fellow reader</p>
            </div>
          )}
          {messages.map((msg) => {
            const isOwn = msg.senderId === user.uid;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] px-4 py-2 rounded-2xl text-sm ${
                    isOwn
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-200'
                      : 'bg-white text-gray-900 shadow-sm border border-gray-100'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-amber-100 bg-white/80 backdrop-blur-sm rounded-b-2xl">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white/80"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="p-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-amber-200"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* In-chat exchange request */}
      {showRequest && requestBook && requestRecipient && (
        <ExchangeRequestView
          recipient={requestRecipient}
          book={requestBook}
          onClose={() => {
            setShowRequest(false);
            setRequestRecipient(null);
          }}
        />
      )}
    </div>
  );
}
