import { NextResponse } from 'next/server';
import {
  normalizePromoCode,
  validatePromoForUse,
  type PromoCode
} from '@asp/shared/promo';
import {
  getAnnualPremium,
  plans,
  type AgeBand,
  type OccupationCategory,
  type PlanCode
} from '@asp/pricing';
import { getDb } from '../../../../lib/firebaseAdmin';

type Payload = {
  code?: string;
  planCode?: string;
  ageBand?: AgeBand;
  occupationCategory?: OccupationCategory;
};

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }

  const code = normalizePromoCode(body.code ?? '');
  if (!code) {
    return NextResponse.json({ ok: false, error: 'Code required' }, { status: 400 });
  }
  if (!body.planCode || !body.ageBand || !body.occupationCategory) {
    return NextResponse.json(
      { ok: false, error: 'Plan context required' },
      { status: 400 }
    );
  }

  const planCode = body.planCode as PlanCode;
  if (!plans.some((p) => p.code === planCode)) {
    return NextResponse.json({ ok: false, error: 'Invalid plan code' }, { status: 400 });
  }
  const basePremium = getAnnualPremium(planCode, body.ageBand, body.occupationCategory);
  if (basePremium === null) {
    return NextResponse.json(
      { ok: false, error: 'Plan is not available for this selection' },
      { status: 400 }
    );
  }

  // Calculate base amount the same way checkout does so the discount preview matches
  const sst = Math.round(basePremium * 0.08);
  const stampDuty = 10;
  const totalBeforeDiscount = basePremium + sst + stampDuty;

  const db = getDb();
  const doc = await db.collection('promoCodes').doc(code).get();
  const promo = doc.exists ? ({ ...(doc.data() as object), code } as PromoCode) : null;

  const result = validatePromoForUse(promo, {
    planCode,
    occupationCategory: body.occupationCategory,
    baseAmount: totalBeforeDiscount
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 422 });
  }

  return NextResponse.json({
    ok: true,
    code: result.code,
    discountType: result.discountType,
    value: result.value,
    discountAmount: result.discountAmount,
    totalBeforeDiscount,
    totalAfterDiscount: Math.max(0, totalBeforeDiscount - result.discountAmount)
  });
}
