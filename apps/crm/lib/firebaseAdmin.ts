import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdminApp() {
  const [existing] = getApps();
  if (existing) return existing;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error('FIREBASE_PROJECT_ID is required');

  return initializeApp({ projectId, credential: applicationDefault() });
}

export function getDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}
