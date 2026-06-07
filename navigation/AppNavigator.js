import { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import HomeView from '../views/HomeView';
import CanvasView from '../views/CanvasView';
import SpacesView from '../views/SpacesView';
import NotesView from '../views/NotesView';
import ProfileModal from '../views/ProfileModal';
import Avatar from '../views/Avatar';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();

function PlusTabButton({ onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={styles.plusWrapper}
    >
      <View style={styles.plusButton}>
        <Ionicons name="add" size={28} color="#fff" />
      </View>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  const { user, profile, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);

  const displayName = profile?.display_name || user?.email || '';

  return (
    <NavigationContainer>
      <Tab.Navigator
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
          tabBarStyle: {
            backgroundColor: '#0a0a0f',
            borderTopColor: '#1e1e2e',
          },
          tabBarActiveTintColor: '#a78bfa',
          tabBarInactiveTintColor: '#444',
        }}
      >
        <Tab.Screen
          name="Hjem"
          component={HomeView}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Canvas"
          component={CanvasView}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'brush' : 'brush-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Opret"
          component={HomeView}
          options={{
            tabBarButton: (props) => <PlusTabButton {...props} />,
            headerShown: false,
          }}
          listeners={({ navigation }) => ({
            tabPress: (e) => {
              e.preventDefault();
              navigation.navigate('Hjem', { openCreate: true });
            },
          })}
        />
        <Tab.Screen
          name="Noter"
          component={NotesView}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'document-text' : 'document-text-outline'} size={size} color={color} />
            ),
          }}
        />
        <Tab.Screen
          name="Spaces"
          component={SpacesView}
          options={{
            tabBarIcon: ({ color, size, focused }) => (
              <Ionicons name={focused ? 'people' : 'people-outline'} size={size} color={color} />
            ),
          }}
        />
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
  plusWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  plusButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#f472b6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
    shadowColor: '#f472b6',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
