import { NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { normalizePromoCode, PROMO_DISCOUNT_TYPES } from '@asp/shared/promo';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';

type PatchPayload = {
  discountType?: 'percent' | 'fixed';
  value?: number;
  active?: boolean;
  validFrom?: string | null;
  validUntil?: string | null;
  usageLimit?: number | null;
  allowedPlans?: string[];
  allowedCategories?: string[];
  notes?: string | null;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { code: rawCode } = await params;
  const code = normalizePromoCode(rawCode);

  let body: PatchPayload;
  try {
    body = (await request.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const db = getDb();
  const ref = db.collection('promoCodes').doc(code);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };

  if (body.discountType !== undefined) {
    if (!PROMO_DISCOUNT_TYPES.includes(body.discountType)) {
      return NextResponse.json({ error: 'Invalid discountType' }, { status: 400 });
    }
    updates.discountType = body.discountType;
  }
  if (body.value !== undefined) {
    if (typeof body.value !== 'number' || body.value <= 0) {
      return NextResponse.json({ error: 'value must be a positive number' }, { status: 400 });
    }
    updates.value = body.value;
  }
  if (body.active !== undefined) updates.active = !!body.active;
  if (body.validFrom !== undefined) {
    updates.validFrom = body.validFrom ? new Date(body.validFrom).getTime() : null;
  }
  if (body.validUntil !== undefined) {
    updates.validUntil = body.validUntil ? new Date(body.validUntil).getTime() : null;
  }
  if (body.usageLimit !== undefined) {
    updates.usageLimit = typeof body.usageLimit === 'number' ? body.usageLimit : null;
  }
  if (body.allowedPlans !== undefined) updates.allowedPlans = body.allowedPlans;
  if (body.allowedCategories !== undefined) updates.allowedCategories = body.allowedCategories;
  if (body.notes !== undefined) updates.notes = body.notes;

  await ref.update(updates);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { code: rawCode } = await params;
  const code = normalizePromoCode(rawCode);

  const db = getDb();
  const ref = db.collection('promoCodes').doc(code);
  const doc = await ref.get();
  if (!doc.exists) {
    return NextResponse.json({ error: 'Promo code not found' }, { status: 404 });
  }

  await ref.update({ active: false, updatedAt: FieldValue.serverTimestamp() });
  return NextResponse.json({ ok: true });
}
