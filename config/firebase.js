import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, browserLocalPersistence } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const firebaseConfig = {
  apiKey: 'AIzaSyAhv0MWhdIhlRRQpkKVRyweFTyhNR9nIP0',
  authDomain: 'lumo-9e5e0.firebaseapp.com',
  projectId: 'lumo-9e5e0',
  storageBucket: 'lumo-9e5e0.firebasestorage.app',
  messagingSenderId: '969736039055',
  appId: '1:969736039055:web:f55efbecbbaa4c73a39efa',
};

const app = initializeApp(firebaseConfig);

export const auth = initializeAuth(app, {
  persistence: Platform.OS === 'web'
    ? browserLocalPersistence
    : getReactNativePersistence(AsyncStorage),
});
