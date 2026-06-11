import { useState } from 'react';
import {
  Modal, View, Text, TouchableOpacity, StyleSheet,
  ScrollView, TextInput, Image, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { GifService } from '../services/GifService';

const EMOJIS = ['❤️', '😂', '🔥', '✨', '👍', '🎉', '😭', '💀', '🤔', '💯', '🫶', '😍'];

const MAX_STICKER_DIM = 200;
const IMAGE_QUALITY = 0.7;

function fitDims(w, h, max = MAX_STICKER_DIM) {
  if (!w || !h) return { width: max, height: max };
  const scale = Math.min(1, max / Math.max(w, h));
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
}

// Bottom sheet opened from the canvas "+" button. Three destinations:
// emoji grid, image picker (resized + base64-embedded), and Giphy GIF search.
export default function StickerSheet({ visible, onAddEmoji, onAddImage, onAddGif, onClose }) {
  const [screen, setScreen] = useState('menu'); // 'menu' | 'emoji' | 'gif'
  const [imageBusy, setImageBusy] = useState(false);
  const [imageError, setImageError] = useState(null);
  const [gifQuery, setGifQuery] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifBusy, setGifBusy] = useState(false);
  const [gifError, setGifError] = useState(null);

  function reset() {
    setScreen('menu');
    setImageBusy(false);
    setImageError(null);
    setGifQuery('');
    setGifResults([]);
    setGifBusy(false);
    setGifError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleEmojiPress(emoji) {
    onAddEmoji(emoji);
    handleClose();
  }

  async function handlePickImage() {
    if (imageBusy) return;
    setImageError(null);
    setImageBusy(true);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setImageError('Adgang til billeder er nødvendig for at tilføje et billede');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const { width, height } = fitDims(asset.width, asset.height);
      const manipulated = await manipulateAsync(
        asset.uri,
        [{ resize: { width, height } }],
        { compress: IMAGE_QUALITY, format: SaveFormat.JPEG, base64: true }
      );
      onAddImage({ uri: `data:image/jpeg;base64,${manipulated.base64}`, width, height });
      handleClose();
    } catch {
      setImageError('Kunne ikke tilføje billedet — prøv igen');
    } finally {
      setImageBusy(false);
    }
  }

  async function handleGifSearch() {
    const q = gifQuery.trim();
    if (!q || gifBusy) return;
    setGifBusy(true);
    setGifError(null);
    try {
      const results = await GifService.search(q);
      setGifResults(results);
      if (results.length === 0) setGifError('Ingen GIFs fundet');
    } catch (e) {
      setGifResults([]);
      setGifError(e.message || 'Kunne ikke hente GIFs');
    } finally {
      setGifBusy(false);
    }
  }

  function handleGifPress(gif) {
    const { width, height } = fitDims(gif.width, gif.height);
    onAddGif({ uri: gif.uri, width, height });
    handleClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.sheet}>
          <View style={styles.handle} />

          <View style={styles.header}>
            {screen !== 'menu' ? (
              <TouchableOpacity style={styles.backBtn} onPress={() => setScreen('menu')}>
                <Text style={styles.backBtnText}>‹</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.backBtnPlaceholder} />
            )}
            <Text style={styles.title} numberOfLines={1}>
              {screen === 'menu' && 'Tilføj til canvas'}
              {screen === 'emoji' && 'Emoji-klistermærke'}
              {screen === 'gif' && 'Søg efter GIF'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {screen === 'menu' && (
            <View style={styles.menu}>
              <TouchableOpacity style={styles.menuItem} onPress={() => setScreen('emoji')}>
                <View style={styles.menuIconWrap}>
                  <Text style={styles.menuIcon}>😀</Text>
                </View>
                <Text style={styles.menuLabel}>Emoji-klistermærke</Text>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={handlePickImage} disabled={imageBusy}>
                <View style={styles.menuIconWrap}>
                  {imageBusy
                    ? <ActivityIndicator color="#a78bfa" size="small" />
                    : <Text style={styles.menuIcon}>🖼️</Text>}
                </View>
                <Text style={styles.menuLabel}>Billede fra galleri</Text>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.menuItem} onPress={() => setScreen('gif')}>
                <View style={styles.menuIconWrap}>
                  <Text style={styles.menuIconText}>GIF</Text>
                </View>
                <Text style={styles.menuLabel}>GIF</Text>
                <Text style={styles.menuChevron}>›</Text>
              </TouchableOpacity>

              {imageError ? <Text style={styles.errorText}>{imageError}</Text> : null}
            </View>
          )}

          {screen === 'emoji' && (
            <View style={styles.emojiGrid}>
              {EMOJIS.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiBtn}
                  onPress={() => handleEmojiPress(emoji)}
                >
                  <Text style={styles.emojiText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {screen === 'gif' && (
            <View style={styles.gifScreen}>
              <View style={styles.searchRow}>
                <TextInput
                  style={styles.searchInput}
                  value={gifQuery}
                  onChangeText={setGifQuery}
                  placeholder="Søg efter en GIF..."
                  placeholderTextColor="#555"
                  returnKeyType="search"
                  onSubmitEditing={handleGifSearch}
                  autoFocus
                />
                <TouchableOpacity
                  style={[styles.searchBtn, gifBusy && styles.searchBtnDisabled]}
                  onPress={handleGifSearch}
                  disabled={gifBusy}
                >
                  {gifBusy
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={styles.searchBtnText}>Søg</Text>}
                </TouchableOpacity>
              </View>

              {gifError ? <Text style={styles.errorText}>{gifError}</Text> : null}

              <ScrollView contentContainerStyle={styles.gifGrid} keyboardShouldPersistTaps="handled">
                {gifResults.map((gif) => (
                  <TouchableOpacity
                    key={gif.id}
                    style={styles.gifItem}
                    onPress={() => handleGifPress(gif)}
                  >
                    <Image source={{ uri: gif.previewUri }} style={styles.gifImage} resizeMode="cover" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
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
    maxHeight: '80%',
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
    alignItems: 'center',
    marginBottom: 20,
    gap: 10,
  },
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: {
    width: 32,
    height: 32,
  },
  backBtnText: {
    color: '#a78bfa',
    fontSize: 20,
    fontWeight: '800',
    marginTop: -2,
  },
  title: {
    fontSize: 18,
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
  menu: {
    gap: 10,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a2a',
    borderRadius: 14,
    padding: 14,
    gap: 14,
  },
  menuIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuIcon: {
    fontSize: 24,
  },
  menuIconText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#a78bfa',
  },
  menuLabel: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  menuChevron: {
    color: '#444',
    fontSize: 22,
    fontWeight: '700',
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  emojiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 12,
    paddingBottom: 8,
  },
  emojiBtn: {
    width: '22%',
    aspectRatio: 1,
    borderRadius: 14,
    backgroundColor: '#1a1a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: {
    fontSize: 32,
  },
  gifScreen: {
    minHeight: 320,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    borderWidth: 1,
    borderColor: '#2a2a3e',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: '#fff',
  },
  searchBtn: {
    backgroundColor: '#a78bfa',
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBtnDisabled: {
    opacity: 0.6,
  },
  searchBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  gifGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingBottom: 8,
  },
  gifItem: {
    width: '32%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#1a1a2a',
  },
  gifImage: {
    width: '100%',
    height: '100%',
  },
});
