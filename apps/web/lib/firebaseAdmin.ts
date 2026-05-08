import { getApps, initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getFirebaseAdminApp() {
  const [existingApp] = getApps();

  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('FIREBASE_PROJECT_ID is required');
  }

  return initializeApp({
    projectId,
    credential: applicationDefault()
  });
}

export function getDb() {
  return getFirestore(getFirebaseAdminApp());
}
