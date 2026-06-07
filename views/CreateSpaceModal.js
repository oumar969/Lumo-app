import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';

export default function CreateSpaceModal({ visible, onClose, onCreate, onNavigate, loading, error }) {
  const [name, setName] = useState('');
  const [createdSpace, setCreatedSpace] = useState(null);

  async function handleCreate() {
    if (!name.trim() || loading) return;
    const space = await onCreate(name.trim());
    if (space) setCreatedSpace(space);
  }

  function handleClose() {
    setName('');
    setCreatedSpace(null);
    onClose();
  }

  function handleGoToSpaces() {
    setName('');
    setCreatedSpace(null);
    onNavigate();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      {createdSpace ? (
        <View style={styles.overlay}>
          <View style={styles.card}>
            <Text style={styles.successGlyph}>✦</Text>
            <Text style={styles.title}>Space oprettet!</Text>
            <Text style={styles.label}>Del denne kode med andre</Text>
            <View style={styles.codeBox}>
              <Text style={styles.code}>{createdSpace.invite_code}</Text>
            </View>
            <Text style={styles.spaceName}>{createdSpace.name}</Text>
            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleGoToSpaces}>
              <Text style={styles.btnPrimaryText}>Gå til Spaces</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleClose}>
              <Text style={styles.btnCancelText}>Luk</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Opret nyt Space</Text>
            <Text style={styles.label}>Hvad skal dit space hedde?</Text>

            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            <TextInput
              style={styles.input}
              placeholder="Navn på dit space..."
              placeholderTextColor="#444"
              value={name}
              onChangeText={setName}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={handleCreate}
            />
            <TouchableOpacity
              style={[styles.btn, styles.btnPrimary, (!name.trim() || loading) && styles.btnDisabled]}
              onPress={handleCreate}
              disabled={!name.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnPrimaryText}>Opret Space</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={handleClose} disabled={loading}>
              <Text style={styles.btnCancelText}>Annuller</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#12121a',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  successGlyph: {
    fontSize: 36,
    color: '#a78bfa',
    textAlign: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
    textAlign: 'center',
  },
  spaceName: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  codeBox: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
  },
  code: {
    fontSize: 28,
    fontWeight: '800',
    color: '#a78bfa',
    letterSpacing: 6,
  },
  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: {
    color: '#f87171',
    fontSize: 14,
  },
  input: {
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnPrimary: {
    backgroundColor: '#a78bfa',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  btnCancelText: {
    color: '#666',
    fontSize: 15,
  },
});
