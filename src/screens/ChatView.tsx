import { useState, useEffect, useRef } from 'react';
import { X, Send, Feather } from 'lucide-react';
import type { Message } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { getChatId, onChatMessages, sendMessage as sendMsg } from '../services/firestoreService';

interface ChatViewProps {
  recipient: { id: string; fullName: string };
  onClose: () => void;
}

export default function ChatView({ recipient, onClose }: ChatViewProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatId = user ? getChatId(user.uid, recipient.id) : '';

  useEffect(() => {
    if (!chatId) return;
    return onChatMessages(chatId, (msgs) => {
      setMessages(msgs);
    });
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[80vh] border border-amber-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-200 to-orange-200 flex items-center justify-center text-amber-700 font-bold text-xs font-serif">
              {(recipient.fullName || '??').substring(0, 2).toUpperCase()}
            </div>
            <span className="font-medium text-gray-900 font-serif">{recipient.fullName || 'Unknown'}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

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
    </div>
  );
}
