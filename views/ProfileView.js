import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Switch, ActivityIndicator, Modal, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { useSpaces } from '../context/SpaceContext';
import { UserService } from '../services/UserService';
import { AuthService } from '../services/AuthService';
import Avatar from './Avatar';

// Keep avatars tiny — they're stored as base64 text directly in the database.
const AVATAR_SIZE = 128;
const AVATAR_QUALITY = 0.5;

const NOTIFICATIONS_KEY = 'lumo_notifications_enabled';

const MONTHS_DA = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
];

function formatDateDa(ts) {
  if (!ts) return '—';
  const d = new Date(ts * 1000);
  return `${d.getDate()}. ${MONTHS_DA[d.getMonth()]} ${d.getFullYear()}`;
}

function timeAgo(ts) {
  if (!ts) return '—';
  const diff = Math.floor(Date.now() / 1000) - ts;
  if (diff < 60) return 'Lige nu';
  if (diff < 3600) return `${Math.floor(diff / 60)} min siden`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} t siden`;
  return `${Math.floor(diff / 86400)} d siden`;
}

const AUTH_ERROR_MESSAGES = {
  'auth/wrong-password': 'Forkert adgangskode.',
  'auth/invalid-credential': 'Forkert adgangskode.',
  'auth/weak-password': 'Adgangskoden skal være mindst 6 tegn.',
  'auth/too-many-requests': 'For mange forsøg. Prøv igen om lidt.',
  'auth/network-request-failed': 'Netværksfejl. Tjek din forbindelse.',
  'auth/requires-recent-login': 'Log ud og ind igen, og prøv derefter igen.',
};

function translateAuthError(e) {
  if (e?.code) return AUTH_ERROR_MESSAGES[e.code] ?? 'Noget gik galt. Prøv igen.';
  return e?.message || 'Noget gik galt. Prøv igen.';
}

function PasswordModal({ visible, onClose }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (visible) {
      setCurrentPassword('');
      setNewPassword('');
      setError(null);
      setSuccess(false);
    }
  }, [visible]);

  const canSubmit = currentPassword.length > 0 && newPassword.length >= 6 && !saving;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await AuthService.reauthenticate(currentPassword);
      await AuthService.changePassword(newPassword);
      setSuccess(true);
    } catch (e) {
      setError(translateAuthError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Skift adgangskode</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {success ? (
            <>
              <View style={styles.successBox}>
                <Text style={styles.successText}>Adgangskoden er opdateret</Text>
              </View>
              <TouchableOpacity style={styles.modalBtn} onPress={onClose}>
                <Text style={styles.modalBtnText}>Luk</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Text style={styles.modalLabel}>Nuværende adgangskode</Text>
              <TextInput
                style={styles.modalInput}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="••••••••"
                placeholderTextColor="#444"
                secureTextEntry
              />

              <Text style={styles.modalLabel}>Ny adgangskode</Text>
              <TextInput
                style={styles.modalInput}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Mindst 6 tegn"
                placeholderTextColor="#444"
                secureTextEntry
              />

              <TouchableOpacity
                style={[styles.modalBtn, !canSubmit && styles.modalBtnDisabled]}
                onPress={handleSubmit}
                disabled={!canSubmit}
              >
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.modalBtnText}>Opdater adgangskode</Text>
                }
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function DeleteAccountModal({ visible, onClose, getToken }) {
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible) {
      setPassword('');
      setError(null);
      setSaving(false);
    }
  }, [visible]);

  async function handleConfirm() {
    if (!password || saving) return;
    setSaving(true);
    setError(null);
    try {
      const token = await getToken();
      await AuthService.reauthenticate(password);
      await UserService.deleteAccount(token);
      await AuthService.deleteCurrentUser();
      // onAuthStateChanged fires with null — RootNavigator switches to AuthScreen
    } catch (e) {
      setError(translateAuthError(e));
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.modalOverlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Slet konto</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Dette sletter din konto og profil permanent. Det kan ikke fortrydes.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.modalLabel}>Bekræft med din adgangskode</Text>
          <TextInput
            style={styles.modalInput}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#444"
            secureTextEntry
          />

          <TouchableOpacity
            style={[styles.modalBtnDanger, (!password || saving) && styles.modalBtnDisabled]}
            onPress={handleConfirm}
            disabled={!password || saving}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.modalBtnText}>Slet konto for evigt</Text>
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function ProfileView() {
  const { user, profile, getToken, refreshProfile, logout } = useAuth();
  const { spaces } = useSpaces();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.display_name || '');
    setUsername(profile?.username || '');
    setBio(profile?.bio || '');
    setStatus(profile?.status || '');
  }, [profile]);

  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATIONS_KEY).then((val) => {
      setNotificationsEnabled(val !== 'false');
    });
  }, []);

  const hasChanges =
    displayName.trim() !== (profile?.display_name || '') ||
    username.trim() !== (profile?.username || '') ||
    bio !== (profile?.bio || '') ||
    status !== (profile?.status || '');

  const canSave = hasChanges && !saving && displayName.trim().length > 0;

  async function handlePickImage() {
    if (uploading) return;
    setError(null);
    setSuccess(null);

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

  async function handleSaveProfile() {
    if (!canSave) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const token = await getToken();
      await UserService.updateProfile({
        display_name: displayName.trim(),
        username: username.trim(),
        bio,
        status,
      }, token);
      await refreshProfile();
      setSuccess('Profil opdateret');
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleNotifications(value) {
    setNotificationsEnabled(value);
    await AsyncStorage.setItem(NOTIFICATIONS_KEY, value ? 'true' : 'false');
  }

  function handleDeleteAccountPress() {
    Alert.alert(
      'Slet konto',
      'Er du sikker på, at du vil slette din konto? Dette kan ikke fortrydes.',
      [
        { text: 'Annuller', style: 'cancel' },
        { text: 'Slet konto', style: 'destructive', onPress: () => setShowDeleteModal(true) },
      ]
    );
  }

  const displayLabel = profile?.display_name || user?.email || 'Bruger';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <TouchableOpacity
        style={styles.avatarWrapper}
        onPress={handlePickImage}
        disabled={uploading}
        activeOpacity={0.8}
      >
        <Avatar name={displayLabel} avatarUrl={profile?.avatar_url} size={96} />
        <View style={styles.editBadge}>
          {uploading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.editBadgeText}>Skift billede</Text>
          }
        </View>
      </TouchableOpacity>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>{success}</Text>
        </View>
      ) : null}

      <Text style={styles.label}>Navn</Text>
      <TextInput
        style={styles.input}
        value={displayName}
        onChangeText={setDisplayName}
        placeholder="Dit navn"
        placeholderTextColor="#444"
        maxLength={40}
      />

      <Text style={styles.label}>Brugernavn</Text>
      <View style={styles.usernameRow}>
        <Text style={styles.atSign}>@</Text>
        <TextInput
          style={[styles.input, styles.usernameInput]}
          value={username}
          onChangeText={(t) => setUsername(t.replace(/\s/g, ''))}
          placeholder="brugernavn"
          placeholderTextColor="#444"
          maxLength={20}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>
      <Text style={styles.hint}>3-20 tegn: bogstaver, tal, _ eller .</Text>

      <Text style={styles.label}>Bio</Text>
      <TextInput
        style={[styles.input, styles.bioInput]}
        value={bio}
        onChangeText={(t) => setBio(t.slice(0, 100))}
        placeholder="Skriv lidt om dig selv..."
        placeholderTextColor="#444"
        multiline
        textAlignVertical="top"
      />
      <Text style={styles.charCount}>{bio.length}/100</Text>

      <Text style={styles.label}>Status</Text>
      <TextInput
        style={styles.input}
        value={status}
        onChangeText={(t) => setStatus(t.slice(0, 50))}
        placeholder="Tegner noget sjovt 🎨"
        placeholderTextColor="#444"
      />
      <Text style={styles.charCount}>{status.length}/50</Text>

      <TouchableOpacity
        style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
        onPress={handleSaveProfile}
        disabled={!canSave}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.saveBtnText}>Gem ændringer</Text>
        }
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatDateDa(profile?.created_at)}</Text>
          <Text style={styles.statLabel}>Medlem siden</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{spaces?.length ?? 0}</Text>
          <Text style={styles.statLabel}>Antal spaces</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{timeAgo(profile?.last_seen)}</Text>
          <Text style={styles.statLabel}>Sidst aktiv</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Indstillinger</Text>
      <View style={styles.settingsCard}>
        <TouchableOpacity style={styles.settingRow} onPress={() => setShowPasswordModal(true)}>
          <Text style={styles.settingLabel}>Skift adgangskode</Text>
          <Text style={styles.settingArrow}>›</Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Notifikationer</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={toggleNotifications}
            trackColor={{ false: '#2a2a3e', true: '#a78bfa' }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.divider} />
        <TouchableOpacity style={styles.settingRow} onPress={logout}>
          <Text style={styles.settingLabel}>Log ud</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.deleteAccountBtn} onPress={handleDeleteAccountPress}>
        <Text style={styles.deleteAccountText}>Slet konto</Text>
      </TouchableOpacity>

      <PasswordModal visible={showPasswordModal} onClose={() => setShowPasswordModal(false)} />
      <DeleteAccountModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        getToken={getToken}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  content: { padding: 20, paddingBottom: 60 },

  avatarWrapper: { alignItems: 'center', marginBottom: 20, gap: 10 },
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
  editBadgeText: { color: '#a78bfa', fontSize: 13, fontWeight: '600' },

  errorBox: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  errorText: { color: '#f87171', fontSize: 14 },
  successBox: {
    backgroundColor: 'rgba(74,222,128,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(74,222,128,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  successText: { color: '#4ade80', fontSize: 14 },

  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#12121a',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    marginBottom: 6,
  },
  usernameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  atSign: { color: '#888', fontSize: 16, fontWeight: '700' },
  usernameInput: { flex: 1 },
  bioInput: { minHeight: 80 },
  charCount: { color: '#444', fontSize: 12, textAlign: 'right', marginBottom: 12 },
  hint: { color: '#444', fontSize: 12, marginBottom: 12 },

  saveBtn: {
    backgroundColor: '#a78bfa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 28,
  },
  saveBtnDisabled: { opacity: 0.4 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#12121a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    padding: 16,
    marginBottom: 28,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: '#fff', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  statLabel: { color: '#555', fontSize: 11, textAlign: 'center' },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  settingsCard: {
    backgroundColor: '#12121a',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    marginBottom: 20,
    overflow: 'hidden',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  settingLabel: { color: '#fff', fontSize: 15, fontWeight: '500' },
  settingArrow: { color: '#444', fontSize: 20 },
  divider: { height: 1, backgroundColor: '#1e1e2e', marginHorizontal: 16 },

  deleteAccountBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#2a1a1a',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
  },
  deleteAccountText: { color: '#f87171', fontWeight: '700', fontSize: 15 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#12121a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#1e1e2e',
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#2a2a3e',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalClose: { color: '#888', fontSize: 16, fontWeight: '700' },
  modalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#555',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  modalInput: {
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
  modalBtn: {
    backgroundColor: '#a78bfa',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnDanger: {
    backgroundColor: '#7f1d1d',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnDisabled: { opacity: 0.4 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  warningBox: {
    backgroundColor: 'rgba(248,113,113,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  warningText: { color: '#f87171', fontSize: 14, lineHeight: 20 },
});
