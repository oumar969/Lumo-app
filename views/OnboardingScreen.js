import { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: W } = Dimensions.get('window');

export const ONBOARDING_KEY = 'lumo_onboarding_done';

const SLIDES = [
  {
    key: '1',
    icon: '✦',
    title: 'Velkommen til Lumo ✦',
    subtitle: 'Det hurtigste sted at dele tanker visuelt med mennesker der betyder noget',
    gradientColors: ['#1a0a2e', '#0d0a1f'],
  },
  {
    key: '2',
    icon: '🎨',
    title: 'Tegn sammen',
    subtitle: 'Opret et fælles rum og tegn, skriv noter og del idéer i realtid',
    gradientColors: ['#0d1a2e', '#0a0d1f'],
  },
  {
    key: '3',
    icon: '🚀',
    title: 'Kom i gang',
    subtitle: 'Opret dit første space eller join et eksisterende med en kode',
    gradientColors: ['#1a0a1f', '#0a0a0f'],
  },
];

function Slide({ item }) {
  return (
    <View style={[styles.slide, { width: W }]}>
      <LinearGradient
        colors={[...item.gradientColors, '#0a0a0f']}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
      />
      <View style={styles.iconRing}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={styles.slideTitle}>{item.title}</Text>
      <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
    </View>
  );
}

export default function OnboardingScreen({ onDone }) {
  const [index, setIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const listRef = useRef(null);

  function goNext() {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    }
  }

  async function finish() {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    onDone();
  }

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0a0a0f', '#120a20', '#0a0a0f']}
        style={StyleSheet.absoluteFill}
      />

      <Animated.FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(e) => {
          setIndex(Math.round(e.nativeEvent.contentOffset.x / W));
        }}
        renderItem={({ item }) => <Slide item={item} />}
      />

      {/* Dots */}
      <View style={styles.dotsRow}>
        {SLIDES.map((_, i) => {
          const width = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [8, 28, 8],
            extrapolate: 'clamp',
          });
          const opacity = scrollX.interpolate({
            inputRange: [(i - 1) * W, i * W, (i + 1) * W],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[styles.dot, { width, opacity }]} />
          );
        })}
      </View>

      {/* CTA */}
      <View style={styles.cta}>
        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={isLast ? finish : goNext}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#a78bfa', '#7c3aed']}
            style={styles.btnGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.btnPrimaryText}>
              {isLast ? 'Kom i gang ✦' : 'Næste →'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        {!isLast && (
          <TouchableOpacity onPress={finish} style={styles.btnSkip}>
            <Text style={styles.btnSkipText}>Spring over</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },
  slide: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingBottom: 200,
  },
  iconRing: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(167,139,250,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(167,139,250,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 36,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 24,
    elevation: 12,
  },
  icon: {
    fontSize: 46,
  },
  slideTitle: {
    fontSize: 27,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  slideSubtitle: {
    fontSize: 16,
    color: '#9ca3af',
    textAlign: 'center',
    lineHeight: 27,
    maxWidth: 300,
  },
  dotsRow: {
    position: 'absolute',
    bottom: 148,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 7,
  },
  dot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#a78bfa',
  },
  cta: {
    position: 'absolute',
    bottom: 48,
    left: 24,
    right: 24,
  },
  btnPrimary: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    shadowColor: '#a78bfa',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  btnGradient: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  btnSkip: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  btnSkipText: {
    color: '#555',
    fontSize: 15,
  },
});
