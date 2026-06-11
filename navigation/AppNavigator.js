import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import HomeView from '../views/HomeView';
import CanvasView from '../views/CanvasView';
import SpacesView from '../views/SpacesView';
import NotesView from '../views/NotesView';
import ProfileModal from '../views/ProfileModal';
import Avatar from '../views/Avatar';
import GlassTabBar from './GlassTabBar';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { user, profile, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const displayName = profile?.display_name || user?.email || '';

  return (
    <NavigationContainer>
      <Tab.Navigator
        tabBar={(props) => <GlassTabBar {...props} />}
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0f', borderBottomColor: '#1e1e2e' },
          headerTintColor: '#fff',
          headerRight: () => (
            <View style={styles.headerRight}>
              <TouchableOpacity onPress={() => setShowProfile(true)}>
                <Avatar name={displayName} avatarUrl={profile?.avatar_url} size={30} />
              </TouchableOpacity>
              <TouchableOpacity onPress={logout}>
                <Text style={{ color: '#555', fontSize: 14 }}>Log ud</Text>
              </TouchableOpacity>
            </View>
          ),
        }}
      >
        <Tab.Screen name="Hjem" component={HomeView} />
        <Tab.Screen name="Canvas" component={CanvasView} />
        <Tab.Screen
          name="Opret"
          component={HomeView}
          options={{ headerShown: false }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Hjem', { openCreate: true });
            },
          })}
        />
        <Tab.Screen name="Noter" component={NotesView} />
        <Tab.Screen name="Spaces" component={SpacesView} />
      </Tab.Navigator>
      <ProfileModal visible={showProfile} onClose={() => setShowProfile(false)} />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginRight: 16,
  },
});
