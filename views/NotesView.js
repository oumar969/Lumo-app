import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Modal, TextInput, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSpaces } from '../context/SpaceContext';
import { useAuth } from '../context/AuthContext';
import { NoteService } from '../services/NoteService';
import { LiveNotesService } from '../services/LiveNotesService';

function timeAgo(ts) {
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'Lige nu';
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} t siden`;
  return `${Math.floor(diff / 86400)} d siden`;
}

function NoteCard({ note, onPress }) {
  const preview = note.content?.trim() || '(tom note)';
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(note)} activeOpacity={0.75}>
      <Text style={styles.cardContent} numberOfLines={4}>{preview}</Text>
      <View style={styles.cardMeta}>
        <Text style={styles.cardAuthor}>{note.author_name || 'Ukendt'}</Text>
        <Text style={styles.cardTime}>{timeAgo(note.updated_at)}</Text>
      </View>
    </TouchableOpacity>
  );
}

function NoteModal({ note, visible, onClose, onSave, onDelete, saving }) {
  const [content, setContent] = useState('');
  const isNew = !note?.id;

  useEffect(() => {
    setContent(note?.content ?? '');
  }, [note?.id, visible]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{isNew ? 'Ny note' : 'Rediger note'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.noteInput}
            value={content}
            onChangeText={setContent}
            placeholder="Skriv din note her..."
            placeholderTextColor="#444"
            multiline
            autoFocus
            textAlignVertical="top"
          />

          <View style={styles.modalActions}>
            {!isNew && (
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDelete(note.id)}
                disabled={saving}
              >
                <Text style={styles.deleteBtnText}>Slet</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
              onPress={() => onSave(content)}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Gem</Text>
              }
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function NotesView() {
  const { activeSpace } = useSpaces();
  const { getToken } = useAuth();

  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editNote, setEditNote] = useState(null);  // null = closed, {} = new, note obj = edit
  const [modalVisible, setModalVisible] = useState(false);

  // A random per-mount id — NOT the account's uid. Two devices signed into
  // the same account are still two separate live-sync participants, so we
  // can't use uid alone to tell "my own broadcast" apart from "someone
  // else's": that would make each device deafen itself to the other.
  const sessionIdRef = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`);

  const fetchNotes = useCallback(async () => {
    if (!activeSpace) return;
    setLoading(true);
    try {
      const token = await getToken();
      const data = await NoteService.getNotes(activeSpace.id, token);
      setNotes(data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [activeSpace?.id, getToken]);

  useFocusEffect(useCallback(() => { fetchNotes(); }, [fetchNotes]));

  // Subscribe to live notes updates for this space — refresh the list
  // instantly when any member creates, edits or deletes a note.
  useEffect(() => {
    if (!activeSpace) return;

    const sessionId = sessionIdRef.current;
    const unsubscribe = LiveNotesService.subscribeUpdates(activeSpace.id, ({ updatedBy }) => {
      if (updatedBy === sessionId) return; // our own change — already applied locally
      fetchNotes();
    });

    return unsubscribe;
  }, [activeSpace?.id, fetchNotes]);

  function openNew() {
    setEditNote({});
    setModalVisible(true);
  }

  function openEdit(note) {
    setEditNote(note);
    setModalVisible(true);
  }

  function closeModal() {
    setModalVisible(false);
    setEditNote(null);
  }

  async function handleSave(content) {
    setSaving(true);
    try {
      const token = await getToken();
      if (!editNote?.id) {
        const created = await NoteService.createNote(activeSpace.id, content, token);
        setNotes((prev) => [created, ...prev]);
      } else {
        await NoteService.updateNote(editNote.id, content, token);
        setNotes((prev) =>
          prev.map((n) => n.id === editNote.id
            ? { ...n, content, updated_at: Math.floor(Date.now() / 1000) }
            : n
          )
        );
      }
      LiveNotesService.pushUpdate(activeSpace.id, sessionIdRef.current).catch(() => {});
      closeModal();
    } catch {
      // keep modal open so user can retry
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(noteId) {
    setSaving(true);
    try {
      const token = await getToken();
      await NoteService.deleteNote(noteId, token);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      LiveNotesService.pushUpdate(activeSpace.id, sessionIdRef.current).catch(() => {});
      closeModal();
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  }

  if (!activeSpace) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyGlyph}>✦</Text>
        <Text style={styles.emptyTitle}>Intet space valgt</Text>
        <Text style={styles.emptySubtitle}>
          Åbn et space fra fanen Spaces{'\n'}for at se noter.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && notes.length === 0 ? (
        <View style={styles.empty}>
          <ActivityIndicator color="#a78bfa" size="large" />
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyGlyph}>📝</Text>
          <Text style={styles.emptyTitle}>Ingen noter endnu</Text>
          <Text style={styles.emptySubtitle}>
            Tryk + for at skrive den første note.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => <NoteCard note={item} onPress={openEdit} />}
          refreshing={loading}
          onRefresh={fetchNotes}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openNew} activeOpacity={0.85}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      <NoteModal
        note={editNote}
        visible={modalVisible}
        onClose={closeModal}
        onSave={handleSave}
        onDelete={handleDelete}
        saving={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  list: { padding: 16, paddingBottom: 100 },
  empty: {
    flex: 1, backgroundColor: '#0a0a0f',
    alignItems: 'center', justifyContent: 'center', padding: 32,
  },
  emptyGlyph: { fontSize: 48, marginBottom: 16, textAlign: 'center' },
  emptyTitle: {
    fontSize: 20, fontWeight: '700', color: '#fff',
    marginBottom: 10, textAlign: 'center',
  },
  emptySubtitle: { fontSize: 15, color: '#555', textAlign: 'center', lineHeight: 22 },

  card: {
    backgroundColor: '#12121a',
    borderRadius: 16, padding: 16,
    marginBottom: 12,
    borderWidth: 1, borderColor: '#1e1e2e',
  },
  cardContent: { color: '#ddd', fontSize: 15, lineHeight: 22, marginBottom: 12 },
  cardMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardAuthor: { fontSize: 12, color: '#a78bfa', fontWeight: '600' },
  cardTime: { fontSize: 12, color: '#444' },

  fab: {
    position: 'absolute', bottom: 110, right: 24,
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#f472b6',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#f472b6', shadowOpacity: 0.4,
    shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  fabText: { color: '#fff', fontSize: 28, fontWeight: '300', lineHeight: 32 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: 1, borderColor: '#1e1e2e',
    paddingHorizontal: 20, paddingBottom: 32,
    minHeight: '60%',
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#2a2a3e',
    borderRadius: 2, alignSelf: 'center',
    marginTop: 12, marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#888', fontSize: 16, fontWeight: '700' },
  noteInput: {
    flex: 1, backgroundColor: '#0a0a0f',
    borderWidth: 1, borderColor: '#2a2a3e',
    borderRadius: 12, padding: 14,
    fontSize: 16, color: '#fff', lineHeight: 24,
    minHeight: 160, marginBottom: 16,
  },
  modalActions: { flexDirection: 'row', gap: 10 },
  deleteBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#2a1a1a',
  },
  deleteBtnText: { color: '#f87171', fontWeight: '600', fontSize: 15 },
  saveBtn: {
    flex: 2, paddingVertical: 14, borderRadius: 12,
    alignItems: 'center', backgroundColor: '#a78bfa',
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
