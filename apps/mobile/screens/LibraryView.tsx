import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { onUserBooks, addBook, deleteBook, updateBook } from '@iraval/shared';
import type { Book } from '@iraval/shared';

const LANGUAGES = [
  'English', 'Tamil', 'Telugu', 'Kannada', 'Malayalam', 'Hindi',
  'French', 'German', 'Spanish', 'Other',
];

export function LibraryView() {
  const { user } = useAuth();
  const { success: toastSuccess, error: toastError } = useToast();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLang, setSearchLang] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newAuthor, setNewAuthor] = useState('');
  const [newLanguage, setNewLanguage] = useState('English');
  const [customLanguage, setCustomLanguage] = useState('');
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAuthor, setEditAuthor] = useState('');
  const [editLanguage, setEditLanguage] = useState('English');
  const [editCustomLang, setEditCustomLang] = useState('');
  const [editShowOther, setEditShowOther] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const loadBooks = useCallback(() => {
    if (!user) return;
    return onUserBooks(user.uid, (loadedBooks) => {
      setBooks(loadedBooks);
      setLoading(false);
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadBooks();
  }, [user, loadBooks]);

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
      toastSuccess('Book added!');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to add book';
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (book: Book) => {
    setEditingBook(book);
    setEditTitle(book.title || '');
    setEditAuthor(book.author || '');
    setEditLanguage(book.language || 'English');
    setEditShowOther(book.language === 'Other');
    setShowEditModal(true);
  };

  const handleEditBook = async () => {
    if (!user || !editingBook || !editTitle.trim() || !editAuthor.trim()) return;
    const lang = editShowOther ? (editCustomLang.trim() || 'Other') : editLanguage;
    setSaving(true);
    try {
      await updateBook(user.uid, editingBook.id, {
        title: editTitle.trim(),
        author: editAuthor.trim(),
        language: lang,
      });
      setShowEditModal(false);
      setEditingBook(null);
      toastSuccess('Book updated!');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to update book';
      toastError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBook = async (bookId: string) => {
    try {
      await deleteBook(user!.uid, bookId);
      setDeleteConfirm(null);
      toastSuccess('Book removed');
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to delete book';
      toastError(message);
    }
  };

  const filteredBooks = books.filter((book) => {
    const matchesSearch = !searchQuery ||
      book.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.author?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLang = !searchLang || book.language === searchLang;
    return matchesSearch && matchesLang;
  });

  const statusConfig: Record<string, { bg: string; text: string }> = {
    available: { bg: '#dcfce7', text: 'Available' },
    borrowed: { bg: '#dbeafe', text: 'Borrowed' },
    lent: { bg: '#bbf7d0', text: 'Lent' },
    pending_exchange: { bg: '#fed7aa', text: 'Pending' },
  };

  return (
    <View style={styles.container}>
      {/* Search & filter */}
      <View style={styles.filterRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search your books..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <View style={styles.langFilter}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity
              style={[styles.langChip, !searchLang && styles.langChipActive]}
              onPress={() => setSearchLang('')}
            >
              <Text style={[styles.langChipText, !searchLang && styles.langChipTextActive]}>All</Text>
            </TouchableOpacity>
            {LANGUAGES.map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[styles.langChip, searchLang === lang && styles.langChipActive]}
                onPress={() => setSearchLang(lang)}
              >
                <Text style={[styles.langChipText, searchLang === lang && styles.langChipTextActive]}>{lang}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>

      {loading ? (
        <Text style={styles.loadingText}>Loading...</Text>
      ) : filteredBooks.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📚</Text>
          <Text style={styles.emptyText}>Your library is empty</Text>
          <Text style={styles.emptySubtext}>Add books to get started</Text>
        </View>
      ) : (
        <FlatList
          data={filteredBooks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const status = statusConfig[item.bookStatus || 'available'];
            return (
              <View style={styles.bookCard}>
                <View style={styles.bookCover}>
                  {item.coverImageURL ? (
                    <Image source={{ uri: item.coverImageURL }} style={styles.bookImage} />
                  ) : (
                    <Text style={styles.bookIcon}>📖</Text>
                  )}
                </View>
                <View style={styles.bookInfo}>
                  <Text style={styles.bookTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.bookAuthor}>{item.author}</Text>
                  <Text style={styles.bookLang}>{item.language}</Text>
                  {status && (
                    <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                      <Text style={[styles.statusText, { color: '#1c1917' }]}>{status.text}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.bookActions}>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
                    <Text style={styles.actionText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionBtn} onPress={() => setDeleteConfirm(item.id)}>
                    <Text style={styles.actionText}>🗑️</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          contentContainerStyle={styles.list}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Book</Text>
            <TextInput style={styles.input} placeholder="Title *" value={newTitle} onChangeText={setNewTitle} />
            <TextInput style={styles.input} placeholder="Author *" value={newAuthor} onChangeText={setNewAuthor} />
            <View style={styles.langSection}>
              <Text style={styles.label}>Language</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langChip, newLanguage === lang && styles.langChipActive]}
                    onPress={() => { setNewLanguage(lang); setShowOtherInput(lang === 'Other'); }}
                  >
                    <Text style={[styles.langChipText, newLanguage === lang && styles.langChipTextActive]}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {showOtherInput && (
              <TextInput style={styles.input} placeholder="Custom language" value={customLanguage} onChangeText={setCustomLanguage} />
            )}
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleAddBook} disabled={saving}>
              <Text style={styles.saveButtonText}>{saving ? 'Adding...' : 'Add Book'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Book</Text>
            <TextInput style={styles.input} placeholder="Title *" value={editTitle} onChangeText={setEditTitle} />
            <TextInput style={styles.input} placeholder="Author *" value={editAuthor} onChangeText={setEditAuthor} />
            <View style={styles.langSection}>
              <Text style={styles.label}>Language</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {LANGUAGES.map((lang) => (
                  <TouchableOpacity
                    key={lang}
                    style={[styles.langChip, editLanguage === lang && styles.langChipActive]}
                    onPress={() => { setEditLanguage(lang); setEditShowOther(lang === 'Other'); }}
                  >
                    <Text style={[styles.langChipText, editLanguage === lang && styles.langChipTextActive]}>{lang}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            {editShowOther && (
              <TextInput style={styles.input} placeholder="Custom language" value={editCustomLang} onChangeText={setEditCustomLang} />
            )}
            <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleEditBook} disabled={saving}>
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelButton} onPress={() => setShowEditModal(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete confirmation */}
      <Modal visible={!!deleteConfirm} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Remove Book?</Text>
            <Text style={styles.modalSub}>This action cannot be undone.</Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteConfirm && handleDeleteBook(deleteConfirm)}>
                <Text style={styles.deleteBtnText}>Remove</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setDeleteConfirm(null)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fffbeb' },
  filterRow: { paddingHorizontal: 16, paddingTop: 12 },
  searchInput: {
    borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 12, marginBottom: 8, fontSize: 16,
  },
  langFilter: { marginBottom: 8 },
  langChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff', borderWidth: 1, borderColor: '#e7e5e4', marginRight: 6 },
  langChipActive: { backgroundColor: '#f59e0b', borderColor: '#f59e0b' },
  langChipText: { fontSize: 12, color: '#44403c' },
  langChipTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 80 },
  bookCard: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#fde68a', alignItems: 'center' },
  bookCover: { width: 44, height: 60, borderRadius: 8, backgroundColor: '#fef3c7', alignItems: 'center', justifyContent: 'center' },
  bookImage: { width: 44, height: 60, borderRadius: 8 },
  bookIcon: { fontSize: 22 },
  bookInfo: { flex: 1, marginLeft: 10 },
  bookTitle: { fontSize: 15, fontWeight: '600', color: '#1c1917' },
  bookAuthor: { fontSize: 13, color: '#78716c', marginTop: 2 },
  bookLang: { fontSize: 11, color: '#a8a29e', marginTop: 1 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginTop: 4, alignSelf: 'flex-start' },
  statusText: { fontSize: 10, fontWeight: '600' },
  bookActions: { flexDirection: 'row', gap: 6 },
  actionBtn: { padding: 6 },
  actionText: { fontSize: 16 },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, color: '#78716c', fontWeight: '500' },
  emptySubtext: { fontSize: 14, color: '#a8a29e', marginTop: 4 },
  loadingText: { textAlign: 'center', paddingVertical: 40, color: '#78716c' },
  fab: { position: 'absolute', bottom: 24, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: '#f59e0b', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6, elevation: 6 },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24, width: '88%', maxWidth: 420 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#92400e', marginBottom: 16, fontFamily: 'serif' },
  modalSub: { fontSize: 14, color: '#78716c', marginBottom: 16 },
  input: { borderWidth: 1, borderColor: '#e7e5e4', borderRadius: 12, padding: 12, marginBottom: 12, fontSize: 16 },
  label: { fontSize: 14, fontWeight: '600', color: '#44403c', marginBottom: 6 },
  langSection: { marginBottom: 12 },
  saveButton: { backgroundColor: '#f59e0b', padding: 14, borderRadius: 12, alignItems: 'center' },
  saveButtonDisabled: { opacity: 0.6 },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelButton: { padding: 14, alignItems: 'center', marginTop: 8 },
  cancelButtonText: { color: '#78716c', fontSize: 16 },
  deleteActions: { flexDirection: 'row', gap: 8 },
  deleteBtn: { flex: 1, backgroundColor: '#dc2626', padding: 14, borderRadius: 10, alignItems: 'center' },
  deleteBtnText: { color: '#fff', fontWeight: '600', fontSize: 16 },
  cancelBtn: { flex: 1, padding: 14, alignItems: 'center' },
  cancelBtnText: { color: '#78716c', fontSize: 16 },
});
