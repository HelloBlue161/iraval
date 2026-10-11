import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Star, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import {
  onReviews,
  submitReview,
  deleteReview,
  getUserById,
  type AppReview,
} from '../services/firestoreService';

function Stars({ value, onPick, size = 'w-8 h-8' }: { value: number; onPick?: (n: number) => void; size?: string }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          className={onPick ? 'transition hover:scale-110' : 'cursor-default'}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            className={`${size} ${n <= value ? 'text-amber-400 fill-amber-400' : 'text-gray-300'}`}
          />
        </button>
      ))}
    </div>
  );
}

/**
 * Public app ratings: one review per user, visible to everyone signed in.
 * The aggregate doubles as social proof (and college-app material).
 */
export default function ReviewsView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [reviews, setReviews] = useState<AppReview[]>([]);
  const [username, setUsername] = useState('anonymous');
  const [rating, setRating] = useState(5);
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const unsub = onReviews(setReviews);
    return unsub;
  }, []);

  useEffect(() => {
    if (!user) return;
    getUserById(user.uid).then((p) => {
      setUsername(p?.username || user.email?.split('@')[0] || 'anonymous');
    });
  }, [user?.uid]);

  const myReview = user ? reviews.find((r) => r.userId === user.uid) : undefined;

  useEffect(() => {
    if (myReview && !editing) {
      setRating(myReview.rating);
      setText(myReview.text);
    }
  }, [myReview?.userId, editing]);

  const avg = reviews.length
    ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    : 0;

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      await submitReview(user.uid, username, rating, text);
      toastSuccess(myReview ? 'Review updated!' : 'Thanks for the review!');
      setEditing(false);
    } catch {
      toastError('Could not save your review. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !myReview) return;
    try {
      await deleteReview(user.uid);
      toastSuccess('Review removed.');
      setRating(5);
      setText('');
      setEditing(false);
    } catch {
      toastError('Could not remove your review.');
    }
  };

  const showForm = !myReview || editing;

  return (
    <div className="max-w-2xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-amber-600 mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-bold font-serif text-gray-900 mb-1">App reviews</h1>
      <p className="text-sm text-gray-500 mb-6">What readers think of Iraval</p>

      {/* Summary */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-6 shadow-sm mb-6 flex items-center gap-5">
        <div className="text-5xl font-bold font-serif text-gray-900">
          {reviews.length ? avg.toFixed(1) : '–'}
        </div>
        <div>
          <Stars value={Math.round(avg)} size="w-5 h-5" />
          <p className="text-sm text-gray-500 mt-1">
            {reviews.length} review{reviews.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Your review */}
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-6 shadow-sm mb-6">
        <h2 className="font-semibold text-gray-900 font-serif mb-3">
          {myReview && !editing ? 'Your review' : myReview ? 'Edit your review' : 'Rate Iraval'}
        </h2>
        {showForm ? (
          <div className="space-y-4">
            <Stars value={rating} onPick={setRating} />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="A few words — what works, what doesn't… (optional)"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none text-sm bg-white resize-y"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200 disabled:opacity-50"
              >
                {saving ? 'Saving…' : myReview ? 'Update review' : 'Submit review'}
              </button>
              {editing && (
                <button
                  onClick={() => {
                    setEditing(false);
                    if (myReview) {
                      setRating(myReview.rating);
                      setText(myReview.text);
                    }
                  }}
                  className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        ) : (
          myReview && (
            <div>
              <Stars value={myReview.rating} size="w-5 h-5" />
              {myReview.text && <p className="text-sm text-gray-700 mt-2">{myReview.text}</p>}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => setEditing(true)}
                  className="text-sm text-amber-600 hover:text-amber-700 font-medium"
                >
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  className="text-sm text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
          )
        )}
      </div>

      {/* All reviews */}
      <h2 className="font-semibold text-gray-900 font-serif mb-3">All reviews</h2>
      {reviews.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8 bg-white/80 rounded-xl border border-amber-100">
          No reviews yet — be the first!
        </p>
      ) : (
        <div className="space-y-3">
          {reviews.map((r) => (
            <div
              key={r.userId}
              className="bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-medium text-gray-900">@{r.username}</p>
                <Stars value={r.rating} size="w-4 h-4" />
              </div>
              {r.text && <p className="text-sm text-gray-600">{r.text}</p>}
              {r.updatedAt && (
                <p className="text-xs text-gray-400 mt-1">
                  {r.updatedAt.toLocaleDateString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
