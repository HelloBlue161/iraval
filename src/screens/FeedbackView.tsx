import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Send } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { submitFeedback } from '../services/firestoreService';

const CATEGORIES = [
  { id: 'bug', label: 'Report a bug' },
  { id: 'feature', label: 'Request a feature' },
  { id: 'other', label: 'Something else' },
] as const;

/**
 * Private channel to the team: reports land in the `feedback` collection,
 * readable only via the Firebase console.
 */
export default function FeedbackView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [category, setCategory] = useState<'bug' | 'feature' | 'other'>('bug');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user || !text.trim() || sending) return;
    setSending(true);
    try {
      const username =
        (user as unknown as { username?: string }).username ||
        user.email?.split('@')[0] ||
        'anonymous';
      await submitFeedback({ userId: user.uid, username, category, text });
      toastSuccess("Thanks! Your report is on its way to the team.");
      navigate(-1);
    } catch {
      toastError('Could not send your report. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-amber-600 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold font-serif text-gray-900 mb-1">Report an issue</h1>
      <p className="text-sm text-gray-500 mb-6">
        Tell us what went wrong or what you'd love to see. Only the Iraval team reads these.
      </p>

      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-6 shadow-sm space-y-4">
        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">What is this about?</label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.id)}
                className={`text-sm px-4 py-2 rounded-full border transition ${
                  category === c.id
                    ? 'bg-amber-500 border-amber-500 text-white font-medium'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-amber-300'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700 block mb-2">Details</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 2000))}
            rows={6}
            placeholder="What happened? What did you expect? Steps to reproduce help a lot…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white resize-y"
          />
          <p className="text-xs text-gray-400 text-right mt-1">{text.length}/2000</p>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!text.trim() || sending}
          className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200 disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
          {sending ? 'Sending…' : 'Send report'}
        </button>
      </div>
    </div>
  );
}
