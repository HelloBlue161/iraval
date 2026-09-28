import { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Plus, Search, X, Edit2, Trash2, Book, Globe, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { onUserBooks, addBook, deleteBook, updateBook, onBorrowedBooks, getUserById } from '../services/firestoreService';
import type { Book as BookType } from '../types';
import { LANGUAGES } from '../types';

export default function LibraryView() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [books, setBooks] = useState<BookType[]>([]);
  const [borrowedBooks, setBorrowedBooks] = useState<BookType[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLang, setSearchLang] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newLanguage, setNewLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [editingBook, setEditingBook] = useState<BookType | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editLanguage, setEditLanguage] = useState('English');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [borrowedBy, setBorrowedBy] = useState<Record<string, string>>({});
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadBooks = useCallback(() => {
    if (!user) return;
    return onUserBooks(user.uid, (loadedBooks) => {
      setBooks(loadedBooks);
    });
  }, [user]);

  const loadBorrowedBooks = useCallback(() => {
    if (!user) return;
    return onBorrowedBooks(user.uid, (loadedBooks) => {
      setBorrowedBooks(loadedBooks);
      
      // Fetch borrower names
      loadedBooks.forEach((book) => {
        if (!borrowedBy[book.addedBy] && book.addedBy) {
          getUserById(book.addedBy).then((u) => {
            if (u) setBorrowedBy((prev) => ({ ...prev, [book.addedBy]: u.fullName }));
          });
        }
      });
    });
  }, [user, borrowedBy]);

  useEffect(() => {
    if (!user) return;
    const unsub1 = loadBooks();
    const unsub2 = loadBorrowedBooks();
    return () => {
      unsub1?.();
      unsub2?.();
    };
  }, [user, loadBooks, loadBorrowedBooks]);

  const getLanguage = (value: string, isCustom: boolean) => {
    if (isCustom) return customLanguage.trim() || 'Other';
    return value;
  };

  const handleAddBook = async () => {
    if (!user || !newTitle.trim() || !newAuthor.trim()) return;

    const lang = getLanguage(newLanguage, showOtherInput);
    setSaving(true);
    try {
      await addBook(user.uid, {
        id: `book_${Date.now()}`,
        title: newTitle.trim(),
        author: newAuthor.trim(),
        addedBy: user.uid,
        addedAt: new Date().toISOString(),
        language: lang,
      });
      setShowAddModal(false);
      setNewTitle('');
      setNewAuthor('');
      setNewLanguage('English');
      setCustomLanguage('');
      setShowOtherInput(false);
      toastSuccess('Book added to your library!');
    } catch (err: any) {
      toastError(`Failed to add book: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (book: BookType) => {
    setEditingBook(book);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditLanguage(book.language || 'English');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBook || !user) return;
    setSaving(true);
    try {
      await updateBook(user.uid, editingBook.id, {
        title: editTitle.trim(),
        author: editAuthor.trim(),
      });
      setBooks((prev) =>
        prev.map((b) =>
          b.id === editingBook.id
            ? { ...b, title: editTitle.trim(), author: editAuthor.trim() }
            : b
        )
      );
      setShowEditModal(false);
      toastSuccess('Book updated!');
    } catch {
      toastError('Failed to update book');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bookId: string) => {
    if (!user) return;
    try {
      await deleteBook(user.uid, bookId);
      setDeleteConfirm(null);
      toastSuccess('Book removed from library');
    } catch {
      toastError('Failed to delete book');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
  };

  const allBooks = [...books, ...borrowedBooks];
  
  const filteredBooks = allBooks.filter(
    (book) => {
      const matchesSearch =
        !searchQuery ||
        (book.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (book.author || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLang =
        !searchLang ||
        book.language === searchLang ||
        (searchLang === 'Other' && !['English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi'].includes(book.language || ''));
      return matchesSearch && matchesLang;
    }
  );

  const hasActiveFilters = searchQuery || searchLang;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-serif text-gray-900">My Library</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {books.length} owned · {borrowedBooks.length} borrowed
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 rounded-xl hover:from-amber-600 hover:to-orange-600 transition shadow-lg shadow-amber-200 font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Book
        </button>
      </div>

      {/* Search & filter */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search your books..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white/80 backdrop-blur-sm"
          />
        </div>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={searchLang}
            onChange={(e) => setSearchLang(e.target.value)}
            className="pl-9 pr-8 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white/80 text-sm appearance-none cursor-pointer"
          >
            <option value="">All Languages</option>
            {LANGUAGES.map((lang) => (
              <option key={lang} value={lang}>{lang}</option>
            ))}
          </select>
        </div>
        {(searchQuery || searchLang) && (
          <button
            onClick={() => { setSearchQuery(''); setSearchLang(''); }}
            className="px-3 py-2.5 text-gray-400 hover:text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50 transition"
            title="Clear filters"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {filteredBooks.length === 0 && allBooks.length > 0 && hasActiveFilters && (
        <div className="text-center py-12 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
          <Search className="w-12 h-12 text-amber-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No books match your filters</p>
          <p className="text-sm text-gray-400 mt-1">Try a different search or language</p>
        </div>
      )}

      {filteredBooks.length === 0 && allBooks.length === 0 && (
        <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-xl border border-amber-100">
          <Book className="w-16 h-16 text-amber-300 mx-auto mb-4" />
          <p className="text-gray-500 font-medium text-lg">Your library is empty</p>
          <p className="text-sm text-gray-400 mt-1">
            Start building your collection by adding books
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 text-amber-600 font-medium hover:underline"
          >
            Add your first book
          </button>
        </div>
      )}

      {filteredBooks.length > 0 && (
        <>
          <p className="text-sm text-gray-500 mb-3">
            Showing {filteredBooks.length} of {allBooks.length} books
            {hasActiveFilters && (
              <span className="text-gray-400"> (filtered)</span>
            )}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBooks.map((book) => (
              <div
                key={book.id}
                className={`bg-white/80 backdrop-blur-sm rounded-xl border overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group ${
                  book.bookStatus === 'borrowed' ? 'border-blue-200' : 'border-amber-100'
                }`}
              >
                <div className="h-44 bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center relative">
                  {book.coverImageURL ? (
                    <img
                      src={book.coverImageURL}
                      alt={book.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <BookOpen className="w-12 h-12 text-amber-300" />
                  )}
                  {book.bookStatus === 'borrowed' && (
                    <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-lg font-medium">
                      Borrowed
                    </div>
                  )}
                  <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {book.bookStatus !== 'borrowed' && (
                      <>
                        <button
                          onClick={() => handleEdit(book)}
                          className="p-1.5 bg-white rounded-full shadow hover:bg-amber-50 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(book.id)}
                          className="p-1.5 bg-white rounded-full shadow hover:bg-red-50 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 font-serif line-clamp-1">{book.title}</h3>
                    {book.bookStatus && book.bookStatus !== 'available' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        book.bookStatus === 'borrowed' ? 'bg-blue-100 text-blue-700' :
                        book.bookStatus === 'lent' ? 'bg-green-100 text-green-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {book.bookStatus === 'borrowed' ? 'Borrowed' :
                         book.bookStatus === 'lent' ? 'Lent' : 'Pending'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{book.author}</p>
                  {book.language && (
                    <p className="text-xs text-gray-400 mt-1">{book.language}</p>
                  )}
                  {book.bookStatus === 'borrowed' && borrowedBy[book.addedBy] && (
                    <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Borrowed from {borrowedBy[book.addedBy]}
                    </p>
                  )}
                </div>
                {deleteConfirm === book.id && book.bookStatus !== 'borrowed' && (
                  <div className="px-4 pb-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="flex-1 bg-red-600 text-white text-sm py-2 rounded-lg hover:bg-red-700 transition"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-gray-200 text-gray-700 text-sm py-2 rounded-lg hover:bg-gray-300 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Add Book Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-amber-100 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-serif text-gray-900">Add a Book</h2>
              <button onClick={() => { setShowAddModal(false); setShowOtherInput(false); setCustomLanguage(''); }} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Book title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author *</label>
                <input
                  type="text"
                  value={newAuthor}
                  onChange={(e) => setNewAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  placeholder="Author name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <div className="flex gap-2">
                  <select
                    value={newLanguage}
                    onChange={(e) => {
                      setNewLanguage(e.target.value);
                      setShowOtherInput(e.target.value === 'Other');
                    }}
                    className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white appearance-none cursor-pointer"
                  >
                    {LANGUAGES.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
                {showOtherInput && (
                  <input
                    type="text"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    className="w-full mt-2 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                    placeholder="Enter custom language"
                    autoFocus
                  />
                )}
              </div>
              <button
                onClick={handleAddBook}
                disabled={saving || !newTitle.trim() || !newAuthor.trim()}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-lg shadow-amber-200"
              >
                {saving ? 'Adding...' : 'Add Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Book Modal */}
      {showEditModal && editingBook && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md border border-amber-100 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold font-serif text-gray-900">Edit Book</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Language</label>
                <select
                  value={editLanguage}
                  onChange={(e) => setEditLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white appearance-none cursor-pointer"
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleSaveEdit}
                disabled={saving}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-2.5 rounded-xl font-medium hover:from-amber-600 hover:to-orange-600 disabled:opacity-50 transition shadow-lg shadow-amber-200"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
