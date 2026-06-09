import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { SpaceProvider } from '../context/SpaceContext';
import AppNavigator from './AppNavigator';
import AuthScreen from '../views/auth/AuthScreen';
import OnboardingScreen, { ONBOARDING_KEY } from '../views/OnboardingScreen';

export default function RootNavigator() {
  const { user, loading } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(null);

  useEffect(() => {
    if (!user) {
      setOnboardingDone(null);
      return;
    }
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setOnboardingDone(val === 'true');
    });
  }, [user?.uid]);

  if (loading || (user && onboardingDone === null)) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0a0a0f', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color="#a78bfa" size="large" />
      </View>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!onboardingDone) {
    return <OnboardingScreen onDone={() => setOnboardingDone(true)} />;
  }

  return (
    <SpaceProvider>
      <AppNavigator />
    </SpaceProvider>
  );
}
