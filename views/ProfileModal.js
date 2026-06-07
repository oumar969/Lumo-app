import { useEffect, useState } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useAuth } from '../context/AuthContext';
import { UserService } from '../services/UserService';
import Avatar from './Avatar';

// Keep avatars tiny — they're stored as base64 text directly in the database.
const AVATAR_SIZE = 128;
const AVATAR_QUALITY = 0.5;

export default function ProfileModal({ visible, onClose }) {
  const { user, getToken, profile, refreshProfile } = useAuth();
  const [name, setName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  // Sync the name field with the latest known profile whenever the sheet opens.
  useEffect(() => {
    if (visible) {
      setName(profile?.display_name || '');
      setError(null);
    }
  }, [visible, profile?.display_name]);

  async function handlePickImage() {
    if (uploading) return;
    setError(null);

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Adgang til billeder er nødvendig for at vælge et profilbillede');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.[0]?.uri) return;

    setUploading(true);
    try {
      const manipulated = await manipulateAsync(
        result.assets[0].uri,
        [{ resize: { width: AVATAR_SIZE, height: AVATAR_SIZE } }],
        { compress: AVATAR_QUALITY, format: SaveFormat.JPEG, base64: true }
      );
      const avatar_url = `data:image/jpeg;base64,${manipulated.base64}`;
      const token = await getToken();
      await UserService.updateProfile({ avatar_url }, token);
      await refreshProfile();
    } catch {
      setError('Kunne ikke gemme billedet — prøv igen');
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed || trimmed === profile?.display_name || savingName) return;
    setSavingName(true);
    setError(null);
    try {
      const token = await getToken();
      await UserService.updateProfile({ display_name: trimmed }, token);
      await refreshProfile();
    } catch (e) {
      setError(e.message);
    } finally {
      setSavingName(false);
    }
  }

  const displayName = profile?.display_name || user?.email || 'Ukendt bruger';
  const nameUnchanged = !name.trim() || name.trim() === profile?.display_name;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            <Text style={styles.title}>Min profil</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.avatarWrapper}
            onPress={handlePickImage}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <Avatar name={displayName} avatarUrl={profile?.avatar_url} size={96} />
            <View style={styles.editBadge}>
              {uploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.editBadgeText}>Skift billede</Text>
              )}
            </View>
          </TouchableOpacity>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>Navn</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Dit navn"
            placeholderTextColor="#444"
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={handleSaveName}
          />
          <TouchableOpacity
            style={[styles.btn, (nameUnchanged || savingName) && styles.btnDisabled]}
            onPress={handleSaveName}
            disabled={nameUnchanged || savingName}
          >
            {savingName ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>Gem navn</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#2a2a3e',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '700',
  },
  avatarWrapper: {
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  editBadge: {
    backgroundColor: '#1e1e2e',
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    minWidth: 100,
    alignItems: 'center',
  },
  editBadgeText: {
    color: '#a78bfa',
    fontSize: 13,
    fontWeight: '600',
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
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
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
    marginBottom: 12,
  },
  btn: {
    backgroundColor: '#a78bfa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.4,
  },
  btnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
