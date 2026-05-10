import { FieldValue } from 'firebase-admin/firestore';

export type ActivityActor = {
  kind: 'admin' | 'system';
  id: string | null;
  email?: string | null;
};

export type ActivityLog = {
  id: string;
  at: string | null;
  actor: ActivityActor;
  action: string;
  orderId: string | null;
  summary: string;
  payload: Record<string, unknown>;
};

type ActivityInput = {
  actor: ActivityActor;
  action: string;
  orderId?: string | null;
  summary: string;
  payload?: Record<string, unknown>;
};

function toIsoString(ts: unknown) {
  if (!ts || typeof ts !== 'object') return null;
  const timestamp = ts as { toDate?: () => Date; seconds?: number };
  const date = timestamp.toDate?.() ?? (timestamp.seconds ? new Date(timestamp.seconds * 1000) : null);
  return date?.toISOString() ?? null;
}

export function adminActivityActor(admin: { uid: string; email?: string }): ActivityActor {
  return { kind: 'admin', id: admin.uid, email: admin.email ?? null };
}

export async function writeActivityLog(
  db: FirebaseFirestore.Firestore,
  input: ActivityInput
) {
  try {
    await db.collection('activityLogs').add({
      at: FieldValue.serverTimestamp(),
      actor: input.actor,
      action: input.action,
      orderId: input.orderId ?? null,
      summary: input.summary,
      payload: input.payload ?? {}
    });
  } catch (err) {
    console.error('activity_log_write_failed', {
      action: input.action,
      orderId: input.orderId,
      error: err instanceof Error ? err.message : String(err)
    });
  }
}

export function serializeActivityLog(doc: FirebaseFirestore.QueryDocumentSnapshot): ActivityLog {
  const data = doc.data();
  const actor = (data.actor as ActivityActor | undefined) ?? { kind: 'system', id: null };

  return {
    id: doc.id,
    at: toIsoString(data.at),
    actor,
    action: typeof data.action === 'string' ? data.action : 'unknown',
    orderId: typeof data.orderId === 'string' ? data.orderId : null,
    summary: typeof data.summary === 'string' ? data.summary : 'PDPA-safe event',
    payload: (data.payload as Record<string, unknown> | undefined) ?? {}
  };
}

export async function fetchActivityLogs(
  db: FirebaseFirestore.Firestore,
  { limit, cursor }: { limit: number; cursor?: string | null }
) {
  let query: FirebaseFirestore.Query = db.collection('activityLogs').orderBy('at', 'desc');

  if (cursor) {
    const cursorDoc = await db.collection('activityLogs').doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  const snapshot = await query.limit(limit + 1).get();
  const docs = snapshot.docs.slice(0, limit);

  return {
    logs: docs.map(serializeActivityLog),
    nextCursor: snapshot.docs.length > limit && docs.length > 0 ? docs[docs.length - 1].id : null
  };
}
