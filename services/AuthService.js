import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updatePassword,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from 'firebase/auth';
import { auth } from '../config/firebase';

export const AuthService = {
  register: (email, password) =>
    createUserWithEmailAndPassword(auth, email, password),

  login: (email, password) =>
    signInWithEmailAndPassword(auth, email, password),

  logout: () => signOut(auth),

  onAuthStateChanged: (cb) => onAuthStateChanged(auth, cb),

  // Firebase requires a recent sign-in before sensitive actions like
  // changing the password or deleting the account.
  reauthenticate: (password) => {
    const user = auth.currentUser;
    const credential = EmailAuthProvider.credential(user.email, password);
    return reauthenticateWithCredential(user, credential);
  },

  changePassword: (newPassword) =>
    updatePassword(auth.currentUser, newPassword),

  deleteCurrentUser: () => deleteUser(auth.currentUser),
};
