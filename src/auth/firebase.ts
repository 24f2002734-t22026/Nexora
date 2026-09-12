import { getApps, initializeApp } from 'firebase/app';
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
const auth = firebaseEnabled ? getAuth(getApps()[0] ?? initializeApp(config)) : null;

export const firebaseAuth = {
  observe(callback: (user: User | null) => void) {
    return auth ? onAuthStateChanged(auth, callback) : () => undefined;
  },
  async signIn() {
    if (!auth) return null;
    try {
      const res = await signInWithPopup(auth, new GoogleAuthProvider());
      return res.user;
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        console.warn('Firebase Google Auth error:', err);
      }
      return null;
    }
  },
  async signOut() {
    return auth ? signOut(auth) : Promise.resolve();
  },
};
