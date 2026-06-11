import { useEffect, useRef } from 'react';
import { View, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ICONS = {
  Hjem:   { active: 'home',          inactive: 'home-outline' },
  Canvas: { active: 'brush',         inactive: 'brush-outline' },
  Noter:  { active: 'document-text', inactive: 'document-text-outline' },
  Spaces: { active: 'people',        inactive: 'people-outline' },
};

function TabButton({ iconName, focused, onPress, onLongPress, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;
  const pill  = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(pill, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      friction: 8,
      tension: 90,
    }).start();
  }, [focused]);

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.82, useNativeDriver: true, friction: 6 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 4, tension: 140 }).start();

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityState={focused ? { selected: true } : {}}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={iconName}
          size={26}
          color={focused ? '#a78bfa' : 'rgba(255,255,255,0.38)'}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.pill,
          { opacity: pill, transform: [{ scaleX: pill }] },
        ]}
      />
    </TouchableOpacity>
  );
}

function PlusButton({ onPress, accessibilityLabel }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn  = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true, friction: 6 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, friction: 4, tension: 140 }).start();

  return (
    <TouchableOpacity
      style={styles.tabItem}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <LinearGradient
          colors={['#c084fc', '#f472b6']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.plusButton}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </LinearGradient>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Floating, frosted-glass tab bar (Instagram-style). Renders as an absolute
// overlay so the screen content fills the whole height behind it — the blur
// then has something real to frost.
export default function GlassTabBar({ state, descriptors, navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { bottom: insets.bottom + 14 }]} pointerEvents="box-none">
      <View style={styles.shadowBox}>
        <View style={styles.shell}>
          <BlurView
            intensity={100}
            tint="dark"
            experimentalBlurMethod="dimezisBlurView"
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.tint} pointerEvents="none" />
          <View style={styles.content}>
            {state.routes.map((route, index) => {
              const { options } = descriptors[route.key];
              const focused = state.index === index;

              const onPress = () => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              };

              const onLongPress = () => {
                navigation.emit({ type: 'tabLongPress', target: route.key });
              };

              const label = options.tabBarAccessibilityLabel || route.name;

              if (route.name === 'Opret') {
                return <PlusButton key={route.key} onPress={onPress} accessibilityLabel={label} />;
              }

              const icons = ICONS[route.name] || ICONS.Hjem;

              return (
                <TabButton
                  key={route.key}
                  iconName={focused ? icons.active : icons.inactive}
                  focused={focused}
                  onPress={onPress}
                  onLongPress={onLongPress}
                  accessibilityLabel={label}
                />
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
  },
  shadowBox: {
    borderRadius: 30,
    backgroundColor: '#0a0a0f',
    shadowColor: '#a78bfa',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 14,
  },
  shell: {
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(211, 197, 252, 0.25)',
    overflow: 'hidden',
  },
  tint: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 15, 0.6)',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  tabItem: {
    flex: 1,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    marginTop: 6,
    width: 22,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#a78bfa',
    shadowColor: '#a78bfa',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  plusButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    marginTop: -12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    shadowColor: '#f472b6',
    shadowOpacity: 0.6,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
});
