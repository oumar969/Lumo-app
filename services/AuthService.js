import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const AuthService = {
  register: (email, password) =>
    createUserWithEmailAndPassword(auth, email, password),

  login: (email, password) =>
    signInWithEmailAndPassword(auth, email, password),

  logout: () => signOut(auth),

  onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),
};
