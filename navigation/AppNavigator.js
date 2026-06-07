import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import HomeView from '../views/HomeView';
import CanvasView from '../views/CanvasView';
import SpacesView from '../views/SpacesView';
import NotesView from '../views/NotesView';
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
        <Text style={styles.plusText}>+</Text>
      </View>
    </TouchableOpacity>
  );
}

export default function AppNavigator() {
  const { logout } = useAuth();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#0a0a0f', borderBottomColor: '#1e1e2e' },
          headerTintColor: '#fff',
          headerRight: () => (
            <TouchableOpacity onPress={logout} style={{ marginRight: 16 }}>
              <Text style={{ color: '#555', fontSize: 14 }}>Log ud</Text>
            </TouchableOpacity>
          ),
          tabBarStyle: {
            backgroundColor: '#0a0a0f',
            borderTopColor: '#1e1e2e',
          },
          tabBarActiveTintColor: '#a78bfa',
          tabBarInactiveTintColor: '#444',
        }}
      >
        <Tab.Screen name="Hjem" component={HomeView} />
        <Tab.Screen name="Canvas" component={CanvasView} />
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
        <Tab.Screen name="Noter" component={NotesView} />
        <Tab.Screen name="Spaces" component={SpacesView} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
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
  plusText: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '300',
    lineHeight: 32,
  },
});
