import { useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';

export default function JoinSpaceModal({ visible, onClose, onJoin, loading, error }) {
  const [code, setCode] = useState('');

  function handleJoin() {
    if (code.trim() && !loading) onJoin(code.trim());
  }

  function handleClose() {
    setCode('');
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Tilslut med kode</Text>
          <Text style={styles.label}>Indtast invitationskoden fra dit space</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <TextInput
            style={[styles.input, styles.codeInput]}
            placeholder="ABC123"
            placeholderTextColor="#444"
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            autoCapitalize="characters"
            autoFocus
            maxLength={10}
            returnKeyType="done"
            onSubmitEditing={handleJoin}
          />
          <TouchableOpacity
            style={[styles.btn, styles.btnPrimary, (!code.trim() || loading) && styles.btnDisabled]}
            onPress={handleJoin}
            disabled={!code.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnPrimaryText}>Tilslut Space</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={handleClose} disabled={loading}>
            <Text style={styles.btnCancelText}>Annuller</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  label: {
    fontSize: 14,
    color: '#888',
    marginBottom: 16,
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
  codeInput: {
    letterSpacing: 4,
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '700',
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
