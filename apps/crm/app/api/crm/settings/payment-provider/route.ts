import { FieldValue } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';
import { adminActivityActor, writeActivityLog } from '../../../../../lib/activity';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';

type PaymentProvider = 'senangpay' | 'doku';

type PaymentSettingsPayload = {
  activeProvider?: string;
};

function fallbackProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === 'doku' ? 'doku' : 'senangpay';
}

function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === 'doku' || value === 'senangpay';
}

async function readActiveProvider(db: FirebaseFirestore.Firestore) {
  const doc = await db.collection('settings').doc('payment').get();
  const provider = doc.data()?.activeProvider;

  return isPaymentProvider(provider) ? provider : fallbackProvider();
}

export async function GET() {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const db = getDb();
  const activeProvider = await readActiveProvider(db);

  return NextResponse.json({ activeProvider });
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  let body: PaymentSettingsPayload;
  try {
    body = (await request.json()) as PaymentSettingsPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  if (!isPaymentProvider(body.activeProvider)) {
    return NextResponse.json(
      { error: 'activeProvider must be doku or senangpay' },
      { status: 400 }
    );
  }

  const db = getDb();
  const previousProvider = await readActiveProvider(db);
  const now = FieldValue.serverTimestamp();

  await db.collection('settings').doc('payment').set(
    {
      activeProvider: body.activeProvider,
      updatedAt: now,
      updatedBy: { id: admin.uid, email: admin.email ?? null }
    },
    { merge: true }
  );

  await writeActivityLog(db, {
    actor: adminActivityActor(admin),
    action: 'payment_provider_changed',
    orderId: null,
    summary: `Payment provider changed to ${body.activeProvider}`,
    payload: {
      previousProvider,
      activeProvider: body.activeProvider
    }
  });

  return NextResponse.json({ ok: true, activeProvider: body.activeProvider });
}
