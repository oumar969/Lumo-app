import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { SpaceProvider } from '../context/SpaceContext';
import AppNavigator from './AppNavigator';
import AuthScreen from '../views/auth/AuthScreen';

export default function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  return (
    <SpaceProvider>
      <AppNavigator />
    </SpaceProvider>
  );
}
