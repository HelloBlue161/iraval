import { useState } from 'react';
import { X, BookOpen, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { sendExchangeRequest } from '../services/firestoreService';
import type { User } from '../types';
import type { SearchResult } from '../services/firestoreService';

interface ExchangeRequestViewProps {
  recipient: User;
  book: SearchResult;
  onClose: () => void;
}

export default function ExchangeRequestView({ recipient, book, onClose }: ExchangeRequestViewProps) {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState('');

  const handleSend = async () => {
    if (!user) {
      toastError('You must be logged in to send a request.');
      return;
    }
    setSending(true);
    try {
      const exchangeBookId = (book as any).bookId || (book as any).key;
      if (!exchangeBookId) {
        console.error('[Exchange] No bookId found:', book);
        toastError('Missing book information. Please try again.');
        setSending(false);
        return;
      }
      console.log('[Exchange] Sending request:', {
        senderId: user.uid,
        receiverId: recipient.id,
        bookId: exchangeBookId,
        title: book.title,
      });

      await sendExchangeRequest({
        bookId: exchangeBookId,
        bookTitle: book.title,
        bookAuthor: book.author,
        bookCoverImageURL: book.coverImageURL,
        senderId: user.uid,
        receiverId: recipient.id,
        note: note.trim() || undefined,
      });

      toastSuccess(`Exchange request sent to ${recipient.fullName}!`);
      onClose();
    } catch (err: any) {
      console.error('[Exchange] Failed to send request:', err);
      const msg = err?.message || err?.toString() || 'Unknown error';
      toastError(`Failed to send request: ${msg}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-amber-100 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold font-serif text-gray-900">Request Book Exchange</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Book info */}
        <div className="flex gap-3 mb-4 p-3 bg-amber-50 rounded-xl">
          {book.coverImageURL ? (
            <img src={book.coverImageURL} alt={book.title} className="w-14 h-20 object-cover rounded-lg" />
          ) : (
            <div className="w-14 h-20 bg-amber-200 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-amber-600" />
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 text-sm">{book.title || 'Unknown'}</p>
            <p className="text-xs text-gray-500">{book.author || 'Unknown'}</p>
            <p className="text-xs text-amber-600 mt-1">From: {recipient.fullName || 'Unknown'} ({recipient.city || 'N/A'})</p>
          </div>
        </div>

        {/* Note */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Optional note
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none text-sm"
            placeholder="e.g., I'd love to read this! I can share 'Pride and Prejudice' in return."
          />
        </div>

        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-amber-200"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending...' : 'Send Exchange Request'}
        </button>
      </div>
    </div>
  );
}
