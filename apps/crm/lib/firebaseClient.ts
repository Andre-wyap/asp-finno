import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
export { GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
};

function getClientApp() {
  const [existing] = getApps();
  return existing ?? initializeApp(firebaseConfig);
}

export function getClientAuth() {
  return getAuth(getClientApp());
}
