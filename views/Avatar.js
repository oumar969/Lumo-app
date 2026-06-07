import { View, Text, Image, StyleSheet } from 'react-native';

export default function Avatar({ name, avatarUrl, size = 36, online = false }) {
  const initial = (name?.trim()?.[0] || '?').toUpperCase();
  const dotSize = Math.max(10, Math.round(size * 0.32));

  return (
    <View style={[styles.wrapper, { width: size, height: size, borderRadius: size / 2 }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{ width: size, height: size, borderRadius: size / 2 }}
        />
      ) : (
        <Text style={[styles.initial, { fontSize: size * 0.42 }]}>{initial}</Text>
      )}
      {online ? (
        <View
          style={[
            styles.onlineDot,
            { width: dotSize, height: dotSize, borderRadius: dotSize / 2 },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#1e1e2e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initial: {
    color: '#a78bfa',
    fontWeight: '700',
  },
  onlineDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: '#4ade80',
    borderWidth: 2,
    borderColor: '#12121a',
  },
});
