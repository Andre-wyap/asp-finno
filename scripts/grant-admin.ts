/**
 * Run once per admin: ts-node scripts/grant-admin.ts <email>
 * Requires FIREBASE_PROJECT_ID in your environment and ADC credentials
 * (gcloud auth application-default login).
 */
import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.error('Usage: ts-node scripts/grant-admin.ts <email>');
    process.exit(1);
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    console.error('FIREBASE_PROJECT_ID env var is required');
    process.exit(1);
  }

  if (!getApps().length) {
    initializeApp({ projectId, credential: applicationDefault() });
  }

  const auth = getAuth();

  let user;
  try {
    user = await auth.getUserByEmail(email);
  } catch {
    console.error(`User not found: ${email}`);
    console.error('The user must sign in at least once before you can grant claims.');
    process.exit(1);
  }

  await auth.setCustomUserClaims(user.uid, { role: 'admin' });

  console.log(`✓ Granted role:admin to ${email} (uid: ${user.uid})`);
  console.log('The claim takes effect on their next sign-in or token refresh.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
