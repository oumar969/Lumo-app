import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSpaces } from '../context/SpaceContext';
import CreateSpaceModal from './CreateSpaceModal';
import JoinSpaceModal from './JoinSpaceModal';

export default function HomeView({ navigation, route }) {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const { loading, error, createSpace, joinSpace } = useSpaces();

  useEffect(() => {
    if (route?.params?.openCreate) {
      setShowCreate(true);
      navigation.setParams({ openCreate: undefined });
    }
  }, [route?.params?.openCreate]);

  async function handleCreate(name, coverImage) {
    return createSpace(name, coverImage);
  }

  function handleNavigateToSpaces() {
    setShowCreate(false);
    navigation.navigate('Spaces');
  }

  async function handleJoin(code) {
    const space = await joinSpace(code);
    if (space) {
      setShowJoin(false);
      navigation.navigate('Spaces');
    }
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>✦ Lumo</Text>
      <Text style={styles.subtitle}>Dit kreative rum</Text>

      <TouchableOpacity style={styles.button} onPress={() => setShowCreate(true)}>
        <Text style={styles.buttonText}>+ Opret Space</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.buttonOutline} onPress={() => setShowJoin(true)}>
        <Text style={styles.buttonOutlineText}>Join med kode</Text>
      </TouchableOpacity>

      <CreateSpaceModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
        onNavigate={handleNavigateToSpaces}
        loading={loading}
        error={error}
      />
      <JoinSpaceModal
        visible={showJoin}
        onClose={() => setShowJoin(false)}
        onJoin={handleJoin}
        loading={loading}
        error={error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0a0a0f',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    paddingBottom: 100,
  },
  title: {
    fontSize: 40,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#a78bfa',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonOutline: {
    borderWidth: 1,
    borderColor: '#a78bfa',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 16,
    width: '100%',
    alignItems: 'center',
  },
  buttonOutlineText: {
    color: '#a78bfa',
    fontSize: 16,
    fontWeight: '700',
  },
});
