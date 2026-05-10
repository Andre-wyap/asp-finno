import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import { getAnnualPremium, plans, type AgeBand, type OccupationCategory } from '@asp/pricing';
import { normalizeMobile, validateMobile } from '@asp/shared/mobile';
import { parseNric, validateNric } from '@asp/shared/nric';
import { hashNric } from '@asp/shared/nricHash';
import {
  normalizePromoCode,
  validatePromoForUse,
  type PromoCode
} from '@asp/shared/promo';
import { getDb } from '../../../../lib/firebaseAdmin';
import { generateOrderId } from '../../../../lib/orders';
import {
  buildPaymentUrl,
  formatAmount,
  generatePaymentHash,
  getSenangPayConfig
} from '../../../../lib/senangPay';

type CheckoutPayload = {
  applicant?: {
    name?: string;
    nric?: string;
    dob?: string;
    email?: string;
    mobile?: string;
    address?: string;
    gender?: string;
    occupation?: string;
    smoker?: boolean;
  };
  nominees?: Array<{
    name?: string;
    nric?: string;
    relationship?: string;
    nationality?: string;
  }>;
  plan?: {
    code?: string;
    ageBand?: AgeBand;
    occupationCategory?: OccupationCategory;
  };
  pdpaConsent?: {
    accepted?: boolean;
    version?: string;
  };
  promoCode?: string;
};

const VALID_AGE_BANDS: AgeBand[] = ['age_50_and_below', 'age_51_to_65'];
const VALID_CATEGORIES: OccupationCategory[] = ['A', 'B'];

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function setupErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  if (
    message.includes('Could not load the default credentials') ||
    message.includes('default credentials') ||
    message.includes('ADC') ||
    message.includes('application-default')
  ) {
    return {
      message:
        'Firebase ADC credentials are missing. Run `gcloud auth application-default login` in your terminal, then retry checkout.',
      status: 503
    };
  }

  if (message.includes('NRIC_HASH_PEPPER')) {
    return {
      message: 'NRIC_HASH_PEPPER is missing in apps/web/.env.local.',
      status: 503
    };
  }

  if (message.includes('SENANGPAY_MERCHANT_ID') || message.includes('SENANGPAY_SECRET')) {
    return {
      message: 'Senang Pay merchant credentials are missing in apps/web/.env.local.',
      status: 503
    };
  }

  return null;
}

function sanitizeDetail(value: string) {
  return value.replace(/[^A-Za-z0-9.,\-_]/g, '_').slice(0, 500);
}

function getNricHashPepper() {
  const pepper = process.env.NRIC_HASH_PEPPER;

  if (!pepper) {
    throw new Error('NRIC_HASH_PEPPER is required');
  }

  return pepper;
}

function getUnderwritingAssessment(applicant: NonNullable<CheckoutPayload['applicant']>) {
  const reasons: string[] = [];

  if (applicant.smoker) {
    reasons.push('smoker');
  }

  return {
    flag: reasons.length > 0,
    reasons
  };
}

function validatePayload(payload: CheckoutPayload) {
  const applicant = payload.applicant;
  const selectedPlan = payload.plan;

  if (!applicant) {
    return { error: 'Applicant details are required' };
  }

  if (!selectedPlan?.code || !selectedPlan.ageBand || !selectedPlan.occupationCategory) {
    return { error: 'Plan selection is required' };
  }

  if (!VALID_AGE_BANDS.includes(selectedPlan.ageBand)) {
    return { error: 'Invalid age band' };
  }

  if (!VALID_CATEGORIES.includes(selectedPlan.occupationCategory)) {
    return { error: 'Invalid occupation category' };
  }

  const plan = plans.find((candidate) => candidate.code === selectedPlan.code);

  if (!plan) {
    return { error: 'Invalid plan' };
  }

  const premium = getAnnualPremium(
    plan.code,
    selectedPlan.ageBand,
    selectedPlan.occupationCategory
  );

  if (premium === null) {
    return { error: 'Selected plan is not available for this occupation category' };
  }

  const applicantNric = applicant.nric ?? '';
  const parsedNric = parseNric(applicantNric);

  if (!validateNric(applicantNric) || !parsedNric) {
    return { error: 'Applicant NRIC is invalid' };
  }

  const mobile = normalizeMobile(applicant.mobile ?? '');

  if (!validateMobile(mobile)) {
    return { error: 'Applicant mobile number is invalid' };
  }

  if (!applicant.name?.trim()) {
    return { error: 'Applicant name is required' };
  }

  if (!applicant.email?.trim()) {
    return { error: 'Applicant email is required' };
  }

  if (!applicant.address?.trim()) {
    return { error: 'Applicant address is required' };
  }

  if (!applicant.occupation?.trim()) {
    return { error: 'Applicant occupation is required' };
  }

  const nominees = payload.nominees ?? [];

  if (nominees.length > 2) {
    return { error: 'A maximum of 2 nominees is allowed' };
  }

  for (const nominee of nominees) {
    if (!nominee.name?.trim()) {
      return { error: 'Nominee name is required' };
    }

    if (!validateNric(nominee.nric ?? '')) {
      return { error: 'Nominee NRIC is invalid' };
    }

    if (!nominee.relationship?.trim()) {
      return { error: 'Nominee relationship is required' };
    }
  }

  if (!payload.pdpaConsent?.accepted) {
    return { error: 'PDPA consent is required' };
  }

  return {
    applicant,
    nominees,
    plan,
    premium,
    mobile,
    parsedNric
  };
}

export async function POST(request: Request) {
  let payload: CheckoutPayload;

  try {
    payload = (await request.json()) as CheckoutPayload;
  } catch {
    return jsonError('Invalid JSON payload');
  }

  const validated = validatePayload(payload);

  if ('error' in validated) {
    return jsonError(validated.error ?? 'Invalid checkout payload');
  }

  try {
    const { merchantId, secret, paymentBaseUrl } = getSenangPayConfig();
    const db = getDb();
    const orderId = generateOrderId();
    const sst = Math.round(validated.premium * 0.08);
    const stampDuty = 10;
    const subtotal = validated.premium + sst + stampDuty;

    let appliedPromo: {
      code: string;
      discountType: 'percent' | 'fixed';
      value: number;
      discountAmount: number;
    } | null = null;
    const submittedCode = normalizePromoCode(payload.promoCode ?? '');
    if (submittedCode) {
      const promoDoc = await db.collection('promoCodes').doc(submittedCode).get();
      const promo = promoDoc.exists
        ? ({ ...(promoDoc.data() as object), code: submittedCode } as PromoCode)
        : null;
      const result = validatePromoForUse(promo, {
        planCode: validated.plan.code,
        occupationCategory: payload.plan!.occupationCategory!,
        baseAmount: subtotal
      });
      if (!result.ok) {
        return jsonError(result.reason, 422);
      }
      appliedPromo = {
        code: result.code,
        discountType: result.discountType,
        value: result.value,
        discountAmount: result.discountAmount
      };
    }

    const totalPayable = Math.max(0, subtotal - (appliedPromo?.discountAmount ?? 0));
    const amount = formatAmount(totalPayable);
    const detail = sanitizeDetail(`Allianz_Shield_Plus_${validated.plan.name}_${orderId}`);
    const hash = generatePaymentHash({ secret, detail, amount, orderId });
    const trackerToken = crypto.randomUUID();
    const nricHashPepper = getNricHashPepper();
    const underwriting = getUnderwritingAssessment(validated.applicant);

    await db.collection('applications').doc(orderId).set({
      status: 'lead',
      applicant: {
        name: validated.applicant.name?.trim(),
        nricHash: hashNric(validated.applicant.nric ?? '', nricHashPepper),
        dob: validated.parsedNric.dob,
        email: validated.applicant.email?.trim().toLowerCase(),
        mobile: validated.mobile,
        address: validated.applicant.address?.trim(),
        gender: validated.parsedNric.gender,
        occupation: validated.applicant.occupation?.trim(),
        smoker: Boolean(validated.applicant.smoker)
      },
      nominees: validated.nominees.map((nominee) => ({
        name: nominee.name?.trim(),
        nricHash: hashNric(nominee.nric ?? '', nricHashPepper),
        relationship: nominee.relationship?.trim(),
        nationality: nominee.nationality?.trim() || 'Malaysian'
      })),
      plan: {
        code: validated.plan.code,
        ageBand: payload.plan?.ageBand,
        occupationCategory: payload.plan?.occupationCategory
      },
      premium: {
        amount: totalPayable,
        baseAnnualPremium: validated.premium,
        serviceTax: sst,
        stampDuty,
        subtotal,
        discountAmount: appliedPromo?.discountAmount ?? 0,
        currency: 'MYR'
      },
      promo: appliedPromo,
      pdpaConsent: {
        accepted: true,
        at: FieldValue.serverTimestamp(),
        version: payload.pdpaConsent?.version ?? 'v1'
      },
      trackerToken,
      policyNumber: null,
      reminderSent: false,
      ownerAdminId: null,
      underwritingFlag: underwriting.flag,
      underwritingReasons: underwriting.reasons,
      searchKeys: {
        nameLower: validated.applicant.name?.trim().toLowerCase(),
        emailLower: validated.applicant.email?.trim().toLowerCase()
      },
      payment: {
        provider: 'senangpay',
        status: 'initiated',
        amount,
        detail,
        merchantId,
        transactionId: null,
        lastMessage: null,
        hashVerifiedAt: null
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      paidAt: null,
      issuedAt: null
    });

    await db.collection('applications').doc(orderId).collection('events').add({
      type: 'status_change',
      from: null,
      to: 'lead',
      actor: { kind: 'customer', id: null },
      payload: { source: 'checkout_initiate' },
      at: FieldValue.serverTimestamp()
    });

    const redirectUrl = buildPaymentUrl({
      merchantId,
      paymentBaseUrl,
      detail,
      amount,
      orderId,
      hash,
      name: validated.applicant.name?.trim() ?? '',
      email: validated.applicant.email?.trim() ?? '',
      phone: validated.mobile
    });

    return NextResponse.json({ orderId, redirectUrl });
  } catch (error) {
    console.error('checkout_initiate_failed', error);
    const setupError = setupErrorMessage(error);

    if (setupError) {
      return jsonError(setupError.message, setupError.status);
    }

    return jsonError('Unable to initiate checkout', 500);
  }
}
