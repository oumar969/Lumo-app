import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { TouchableOpacity, StyleSheet } from 'react-native';
import HomeView from '../views/HomeView';
import CanvasView from '../views/CanvasView';
import SpacesView from '../views/SpacesView';
import NotesView from '../views/NotesView';
import ProfileView from '../views/ProfileView';
import Avatar from '../views/Avatar';
import GlassTabBar from './GlassTabBar';
import { useAuth } from '../context/AuthContext';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();

function HeaderAvatar() {
  const navigation = useNavigation();
  const { user, profile } = useAuth();
  const displayName = profile?.display_name || user?.email || '';

  return (
    <TouchableOpacity
      style={styles.headerRight}
      onPress={() => navigation.getParent()?.navigate('Profil')}
    >
      <Avatar name={displayName} avatarUrl={profile?.avatar_url} size={30} />
    </TouchableOpacity>
  );
}

function Tabs() {
  return (
    <Tab.Navigator
      tabBar={(props) => <GlassTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: '#0a0a0f', borderBottomColor: '#1e1e2e' },
        headerTintColor: '#fff',
        headerRight: () => <HeaderAvatar />,
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
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0f', borderBottomColor: '#1e1e2e' },
          headerTintColor: '#fff',
        }}
      >
        <Stack.Screen name="Tabs" component={Tabs} options={{ headerShown: false }} />
        <Stack.Screen name="Profil" component={ProfileView} options={{ title: 'Profil' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    marginRight: 16,
  },
});
