import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import {
  normalizePromoCode,
  PROMO_DISCOUNT_TYPES,
  type PromoDiscountType
} from '@asp/shared/promo';
import { authError, verifyAdmin } from '../../../../lib/auth';
import { getDb } from '../../../../lib/firebaseAdmin';

type CreatePayload = {
  code?: string;
  discountType?: PromoDiscountType;
  value?: number;
  active?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  usageLimit?: number | null;
  allowedPlans?: string[];
  allowedCategories?: string[];
  notes?: string | null;
};

export async function GET() {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const db = getDb();
  const snap = await db.collection('promoCodes').orderBy('createdAt', 'desc').limit(200).get();
  const promos = snap.docs.map((d) => {
    const data = d.data();
    return {
      code: d.id,
      discountType: data.discountType,
      value: data.value,
      active: data.active,
      validFrom: data.validFrom ?? null,
      validUntil: data.validUntil ?? null,
      usageLimit: data.usageLimit ?? null,
      usageCount: data.usageCount ?? 0,
      allowedPlans: data.allowedPlans ?? [],
      allowedCategories: data.allowedCategories ?? [],
      notes: data.notes ?? null,
      createdBy: data.createdBy ?? null,
      createdAt: data.createdAt?.toMillis?.() ?? null,
      updatedAt: data.updatedAt?.toMillis?.() ?? null
    };
  });
  return NextResponse.json({ promos });
}

export async function POST(request: Request) {
  let admin;
  try {
    admin = await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  let body: CreatePayload;
  try {
    body = (await request.json()) as CreatePayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const code = normalizePromoCode(body.code ?? '');
  if (!code || !/^[A-Z0-9_-]{3,32}$/.test(code)) {
    return NextResponse.json(
      { error: 'Code must be 3–32 chars, A–Z 0–9 _ -' },
      { status: 400 }
    );
  }
  if (!body.discountType || !PROMO_DISCOUNT_TYPES.includes(body.discountType)) {
    return NextResponse.json({ error: 'discountType must be percent or fixed' }, { status: 400 });
  }
  if (typeof body.value !== 'number' || body.value <= 0) {
    return NextResponse.json({ error: 'value must be a positive number' }, { status: 400 });
  }
  if (body.discountType === 'percent' && body.value > 100) {
    return NextResponse.json({ error: 'percent value cannot exceed 100' }, { status: 400 });
  }

  const db = getDb();
  const ref = db.collection('promoCodes').doc(code);
  const existing = await ref.get();
  if (existing.exists) {
    return NextResponse.json({ error: `Promo code "${code}" already exists` }, { status: 409 });
  }

  await ref.set({
    code,
    discountType: body.discountType,
    value: body.value,
    active: body.active ?? true,
    validFrom: body.validFrom ? new Date(body.validFrom).getTime() : null,
    validUntil: body.validUntil ? new Date(body.validUntil).getTime() : null,
    usageLimit: typeof body.usageLimit === 'number' ? body.usageLimit : null,
    usageCount: 0,
    allowedPlans: body.allowedPlans ?? [],
    allowedCategories: body.allowedCategories ?? [],
    notes: body.notes ?? null,
    createdBy: admin.uid,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp()
  });

  return NextResponse.json({ ok: true, code });
}
