import React, { useState, useEffect } from 'react';
import { BookOpen, Check, X, Clock, Tag, MessageSquare, PenLine, Send, RotateCcw, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { onUserExchanges, acceptExchange, declineExchange, requestReturn, confirmReturn, deleteExchangeAndChat, getUserById } from '../services/firestoreService';
import type { Exchange } from '../types';

export default function MyExchangesView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { success: toastSuccess, error: toastError, info: toastInfo } = useToast();
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientNames, setRecipientNames] = useState<Record<string, string>>({});
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [declineModal, setDeclineModal] = useState<string | null>(null);
  const [declineNote, setDeclineNote] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const unsub = onUserExchanges(user.uid, (exs) => {
      setExchanges(exs);
      setLoading(false);

      exs.forEach((ex) => {
        if (!recipientNames[ex.receiverId] && ex.senderId === user.uid) {
          getUserById(ex.receiverId).then((u) => {
            if (u) setRecipientNames((prev) => ({ ...prev, [ex.receiverId]: u.fullName }));
          });
        }
        if (!senderNames[ex.senderId] && ex.receiverId === user.uid) {
          getUserById(ex.senderId).then((u) => {
            if (u) setSenderNames((prev) => ({ ...prev, [ex.senderId]: u.fullName }));
          });
        }
      });
    });

    return unsub;
  }, [user]);

  const handleAccept = async (id: string) => {
    try {
      await acceptExchange(id);
      toastSuccess('Exchange accepted! You can now chat to coordinate.');
    } catch {
      toastError('Failed to accept exchange.');
    }
  };

  const openDecline = (id: string) => {
    setDeclineModal(id);
    setDeclineNote('');
  };

  const handleDecline = async (id: string) => {
    try {
      const noteToUse = declineNote.trim() || undefined;
      await declineExchange(id, noteToUse);
      setDeclineModal(null);
      setDeclineNote('');

      if (noteToUse) {
        toastInfo('Declined with note saved to the request.');
      } else {
        toastInfo('Exchange declined.');
      }
    } catch {
      toastError('Failed to decline exchange.');
    }
  };

  const handleRequestReturn = async (id: string) => {
    try {
      await requestReturn(id);
      toastSuccess('Return requested! The owner will confirm once they have the book.');
    } catch {
      toastError('Failed to request return.');
    }
  };

  const handleConfirmReturn = async (id: string) => {
    try {
      await confirmReturn(id);
      toastSuccess('Return confirmed! The book is available in your library again.');
    } catch {
      toastError('Failed to confirm return.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      // Removes the record and its book-scoped chat thread together.
      await deleteExchangeAndChat(id);
      setDeleteConfirm(null);
      toastSuccess('Exchange record and its chat deleted.');
    } catch {
      toastError('Failed to delete. If the chat remains, the chat-delete rules may not be published yet.');
    }
  };

  // Only finished exchanges can be removed — active ones drive book
  // availability, badges, and lent status.
  const isDeletable = (status: string) => ['returned', 'declined', 'expired'].includes(status);

  const handleChat = (ex: Exchange) => {
    // One inbox: conversations live in the Chats tab. Deep-link there
    // instead of opening a separate chat modal.
    const isSender = ex.senderId === user?.uid;
    const otherId = isSender ? ex.receiverId : ex.senderId;
    navigate(`/chats?with=${otherId}`);
  };

  const statusConfig: Record<string, { icon: React.ComponentType<React.SVGProps<SVGSVGElement>>; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-amber-600 bg-amber-50', label: 'Pending' },
    accepted: { icon: Check, color: 'text-green-600 bg-green-50', label: 'Accepted' },
    return_requested: { icon: RotateCcw, color: 'text-purple-600 bg-purple-50', label: 'Return requested' },
    returned: { icon: RotateCcw, color: 'text-blue-600 bg-blue-50', label: 'Returned' },
    declined: { icon: X, color: 'text-red-600 bg-red-50', label: 'Declined' },
    expired: { icon: X, color: 'text-gray-500 bg-gray-50', label: 'Expired' },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-8 h-8 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold font-serif text-gray-900">My Exchanges</h1>
        <div className="flex items-center gap-2 text-amber-600">
          <Tag className="w-5 h-5" />
          <span className="text-sm font-medium">Book Exchange</span>
        </div>
      </div>

      {exchanges.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-amber-100">
          <BookOpen className="w-16 h-16 text-amber-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">No exchange requests yet</p>
          <p className="text-sm text-gray-400 mt-1">
            Search for books to start an exchange
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {exchanges
            .sort((a, b) => {
              const order = { pending: 0, return_requested: 1, accepted: 2, returned: 3, declined: 4, expired: 5 };
              return (order[a.status as keyof typeof order] ?? 0) - (order[b.status as keyof typeof order] ?? 0);
            })
            .map((ex) => {
              const config = statusConfig[ex.status as keyof typeof statusConfig] || statusConfig.pending;
              const Icon = config.icon;
              const isIncoming = ex.receiverId === user?.uid;
              const otherName = isIncoming
                ? senderNames[ex.senderId] || 'Loading...'
                : recipientNames[ex.receiverId] || 'Loading...';

              return (
                <div key={ex.id} className={`bg-white rounded-xl border p-4 ${
                  ex.status === 'pending' ? 'border-amber-200' :
                  ex.status === 'accepted' ? 'border-green-200' :
                  (ex.status as string) === 'return_requested' ? 'border-purple-200' :
                  (ex.status as string) === 'returned' ? 'border-blue-200' : 'border-gray-200'
                }`}>
                  <div className="flex items-start gap-3">
                    {ex.bookCoverImageURL ? (
                      <img src={ex.bookCoverImageURL} alt={ex.bookTitle} className="w-12 h-16 object-cover rounded-lg flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-16 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-5 h-5 text-amber-600" />
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm truncate">{ex.bookTitle || 'Unknown Book'}</p>
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${config.color}`}>
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500">{ex.bookAuthor || 'Unknown Author'}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {isIncoming ? `From: ${otherName}` : `To: ${otherName}`}
                      </p>
                      {ex.note && (
                        <p className="text-xs text-gray-500 mt-1 italic bg-gray-50 p-2 rounded-lg">
                          Request note: "{ex.note}"
                        </p>
                      )}
                      {ex.declineNote && (
                        <p className="text-xs text-red-600 mt-1 italic bg-red-50 p-2 rounded-lg">
                          Decline reason: "{ex.declineNote}"
                        </p>
                      )}

                      {/* Status-based actions */}
                      <div className="flex items-center gap-2 mt-2">
                        {ex.status === 'accepted' && isIncoming && (
                          <>
                            <button
                              onClick={() => handleChat(ex)}
                              className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat to coordinate
                            </button>
                            <span className="text-xs text-gray-400">With borrower — they start the return</span>
                          </>
                        )}
                        {ex.status === 'accepted' && !isIncoming && (
                          <>
                            <button
                              onClick={() => handleChat(ex)}
                              className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat to coordinate
                            </button>
                            <button
                              onClick={() => handleRequestReturn(ex.id)}
                              className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Return Book
                            </button>
                          </>
                        )}
                        {ex.status === 'return_requested' && isIncoming && (
                          <>
                            <button
                              onClick={() => handleChat(ex)}
                              className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Chat to coordinate
                            </button>
                            <button
                              onClick={() => handleConfirmReturn(ex.id)}
                              className="flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Confirm Return
                            </button>
                          </>
                        )}
                        {ex.status === 'return_requested' && !isIncoming && (
                          <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-3 py-1.5 rounded-lg">
                            Return requested — waiting for the owner to confirm
                          </span>
                        )}
                        {ex.status === 'declined' && isIncoming && (
                          <button
                            onClick={() => openDecline(ex.id)}
                            className="flex items-center gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition"
                          >
                            <PenLine className="w-3.5 h-3.5" />
                            Send a note
                          </button>
                        )}
                        {/* Delete record: greyed out while the exchange is active,
                            enabled once it's finished (returned/declined/expired) */}
                        {deleteConfirm === ex.id ? (
                          <span className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">Delete this record and its chat?</span>
                            <button
                              onClick={() => handleDelete(ex.id)}
                              className="font-medium text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="font-medium text-gray-500 hover:text-gray-700"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(ex.id)}
                            disabled={!isDeletable(ex.status)}
                            title={isDeletable(ex.status) ? 'Delete this exchange record' : 'Available once the exchange is finished'}
                            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition ${
                              isDeletable(ex.status)
                                ? 'text-gray-500 bg-white border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200'
                                : 'text-gray-300 bg-gray-50 border-gray-100 cursor-not-allowed'
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pending actions */}
                    {ex.status === 'pending' && isIncoming && (
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleAccept(ex.id)}
                          className="p-2 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition"
                          title="Accept"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDecline(ex.id)}
                          className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200 transition"
                          title="Decline"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Decline modal */}
      {declineModal && (() => {
        const ex = exchanges.find((e) => e.id === declineModal);
        if (!ex) return null;
        const declineIsIncoming = ex.receiverId === user?.uid;
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-amber-100 shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold font-serif text-gray-900">Decline Request</h2>
                <button onClick={() => setDeclineModal(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                {declineIsIncoming
                  ? `Decline incoming request for "${ex.bookTitle}"`
                  : `Cancel your outgoing request for "${ex.bookTitle}"`}
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Optional note (will be sent to the requester)
                </label>
                <textarea
                  value={declineNote}
                  onChange={(e) => setDeclineNote(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none resize-none text-sm"
                  rows={3}
                  placeholder="e.g., Book is not available until next month, or I've lost the copy..."
                />
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleDecline(declineModal)}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-red-600 text-white py-2.5 rounded-xl font-medium hover:bg-red-700 transition"
                >
                  <Send className="w-4 h-4" />
                  Decline & Send Note
                </button>
                <button
                  onClick={() => setDeclineModal(null)}
                  className="flex-1 bg-gray-200 text-gray-700 py-2.5 rounded-xl hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
