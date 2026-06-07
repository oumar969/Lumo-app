import { useCallback, useState } from 'react';
import {
  View, Text, FlatList, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSpaces } from '../context/SpaceContext';
import SpaceDetailModal from './SpaceDetailModal';

function SpaceCard({ space, onPress }) {
  const members = space.members || [];
  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(space)} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={1}>{space.name}</Text>
        <View style={styles.memberBadge}>
          <Text style={styles.memberCount}>
            {members.length} {members.length === 1 ? 'medlem' : 'medlemmer'}
          </Text>
        </View>
      </View>
      {space.invite_code ? (
        <View style={styles.codeRow}>
          <Text style={styles.codeLabel}>Invitationskode</Text>
          <Text style={styles.codeValue}>{space.invite_code}</Text>
        </View>
      ) : null}
      <Text style={styles.tapHint}>Tryk for detaljer →</Text>
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
    paddingBottom: 32,
  },
  card: {
    backgroundColor: '#12121a',
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1e1e2e',
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
  memberBadge: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
