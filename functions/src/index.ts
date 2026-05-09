import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { triggerLeadReminderEmail } from '@asp/shared/onStatusChange';

if (!getApps().length) {
  initializeApp();
}

function getDb() {
  return getFirestore();
}

export const healthCheck = onRequest(
  { region: 'asia-southeast1' },
  (_request, response) => response.status(200).json({ ok: true, service: 'asp-functions' })
);

// Runs hourly — finds leads older than 24h with reminderSent=false and sends reminder email
export const leadReminderTick = onSchedule(
  {
    region: 'asia-southeast1',
    schedule: '0 * * * *',
    timeZone: 'Asia/Kuala_Lumpur',
    timeoutSeconds: 540,
    memory: '256MiB',
  },
  async () => {
    const db = getDb();
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const query = db
      .collection('applications')
      .where('status', '==', 'lead')
      .where('reminderSent', '==', false)
      .where('createdAt', '<', cutoff)
      .orderBy('createdAt', 'asc')
      .limit(100);

    const snapshot = await query.get();

    if (snapshot.empty) {
      console.log('leadReminderTick: no eligible leads');
      return;
    }

    console.log(`leadReminderTick: processing ${snapshot.size} leads`);

    const results = await Promise.allSettled(
      snapshot.docs.map(async (doc) => {
        const orderId = doc.id;
        const data = doc.data();

        const eventsCol = doc.ref.collection('events');
        const writeEvent = (eventData: Record<string, unknown>) =>
          eventsCol.add({ ...eventData, at: FieldValue.serverTimestamp() }).then(() => undefined);

        await triggerLeadReminderEmail({
          orderId,
          application: {
            applicantName: data.applicant?.name ?? '',
            applicantEmail: data.applicant?.email ?? '',
            planName: data.plan?.code ?? '',
            planCode: data.plan?.code ?? '',
            premiumAmount: data.premium?.amount ?? 0,
            premiumCurrency: data.premium?.currency ?? 'MYR',
            trackerToken: data.trackerToken ?? '',
          },
          writeEvent,
        });

        // Mark as sent regardless of email success (avoid re-sending on transient failures)
        await doc.ref.update({
          reminderSent: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      })
    );

    const failed = results.filter((r) => r.status === 'rejected');
    if (failed.length > 0) {
      console.error(`leadReminderTick: ${failed.length} failures`, failed.map((f) => (f as PromiseRejectedResult).reason));
    }

    console.log(`leadReminderTick: done. ${snapshot.size - failed.length} succeeded, ${failed.length} failed`);
  }
);
