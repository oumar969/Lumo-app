import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity, ImageBackground,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useSpaces } from '../context/SpaceContext';
import SpaceDetailModal from './SpaceDetailModal';

function SpaceCard({ space, onPress }) {
  const members = space.members || [];
  const hasCover = !!space.cover_image;

  const inner = (
    <>
      {hasCover && (
        <LinearGradient
          colors={['transparent', 'rgba(10,10,15,0.85)', '#0a0a0f']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          pointerEvents="none"
        />
      )}
      <View style={styles.cardHeader}>
        <Text style={[styles.cardName, hasCover && styles.cardNameOnCover]} numberOfLines={1}>
          {space.name}
        </Text>
        <View style={[styles.memberBadge, hasCover && styles.memberBadgeOnCover]}>
          <Text style={styles.memberCount}>
            {members.length} {members.length === 1 ? 'medlem' : 'medlemmer'}
          </Text>
        </View>
      </View>
      {space.invite_code ? (
        <View style={[styles.codeRow, hasCover && styles.codeRowOnCover]}>
          <Text style={styles.codeLabel}>Invitationskode</Text>
          <Text style={styles.codeValue}>{space.invite_code}</Text>
        </View>
      ) : null}
      <Text style={[styles.tapHint, hasCover && styles.tapHintOnCover]}>Tryk for detaljer →</Text>
    </>
  );

  if (hasCover) {
    return (
      <TouchableOpacity activeOpacity={0.75} onPress={() => onPress(space)}>
        <ImageBackground
          source={{ uri: space.cover_image }}
          style={[styles.card, styles.cardWithCover]}
          imageStyle={styles.coverImage}
        >
          {inner}
        </ImageBackground>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(space)} activeOpacity={0.75}>
      {inner}
    </TouchableOpacity>
  );
}

export default function SpacesView() {
  const { spaces, loading, error, fetchSpaces } = useSpaces();
  const [selectedSpace, setSelectedSpace] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchSpaces();
    }, [fetchSpaces])
  );

  if (loading && spaces.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  if (error && spaces.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchSpaces}>
          <Text style={styles.retryText}>Prøv igen</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!loading && spaces.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.emptyTitle}>Ingen spaces endnu</Text>
        <Text style={styles.emptySubtitle}>
          Opret eller join et space fra forsiden.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={spaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => (
          <SpaceCard space={item} onPress={setSelectedSpace} />
        )}
        refreshing={loading}
        onRefresh={fetchSpaces}
      />

      <SpaceDetailModal
        space={selectedSpace}
        visible={!!selectedSpace}
        onClose={() => setSelectedSpace(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  center: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  card: {
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
  },
  cardWithCover: {
    minHeight: 140,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  coverImage: {
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    flex: 1,
    marginRight: 8,
  },
  cardNameOnCover: {
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  memberBadge: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  memberBadgeOnCover: {
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  memberCount: {
    color: '#a78bfa',
    fontSize: 12,
    fontWeight: '600',
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0a0a0f',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 10,
  },
  codeRowOnCover: {
    backgroundColor: 'rgba(10,10,15,0.7)',
  },
  codeLabel: {
    fontSize: 13,
    color: '#555',
  },
  codeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#a78bfa',
    letterSpacing: 2,
  },
  tapHint: {
    fontSize: 12,
    color: '#333',
    textAlign: 'right',
  },
  tapHintOnCover: {
    color: 'rgba(255,255,255,0.35)',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    color: '#f87171',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: '#a78bfa',
    borderRadius: 10,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryText: {
    color: '#a78bfa',
    fontWeight: '600',
  },
});
