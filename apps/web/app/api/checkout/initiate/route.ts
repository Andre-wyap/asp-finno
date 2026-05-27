import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'node:crypto';
import { NextResponse } from 'next/server';
import {
  getAgeBandForAge,
  getAgeFromDob,
  getAnnualPremium,
  getPremiumBreakdown,
  getRoundedPayableAmount,
  LAST_ENTRY_AGE,
  plans,
  type AgeBand,
  type OccupationCategory
} from '@asp/pricing';
import { normalizeMobile, validateMobile } from '@asp/shared/mobile';
import { parseNric, validateNric } from '@asp/shared/nric';
import { hashNric } from '@asp/shared/nricHash';
import {
  normalizePromoCode,
  validatePromoForUse,
  type PromoCode
} from '@asp/shared/promo';
import { triggerLeadReminderEmail } from '@asp/shared/onStatusChange';
import { getDb } from '../../../../lib/firebaseAdmin';
import { generateOrderId } from '../../../../lib/orders';
import {
  buildPaymentUrl,
  formatAmount,
  generatePaymentHash,
  getSenangPayConfig
} from '../../../../lib/senangPay';
import { createDokuCheckoutPayment } from '../../../../lib/doku';
import { getRuntimePaymentProvider } from '../../../../lib/paymentProvider';
import { getMetaBrowserSignals, sendMetaCapiEvent } from '../../../../lib/metaCapi';

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
    annualIncome?: string | number;
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

  if (message.includes('DOKU_CLIENT_ID') || message.includes('DOKU_SECRET_KEY')) {
    return {
      message: 'DOKU sandbox credentials are missing in apps/web/.env.local.',
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

function parseAnnualIncome(value: unknown) {
  const normalized =
    typeof value === 'string' ? Number(value.replace(/,/g, '')) : Number(value);

  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}

function publicBaseUrl() {
  return process.env.TRACKER_BASE_URL ?? 'https://asp.finnomalaysia.com';
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

  const applicantNric = applicant.nric ?? '';
  const parsedNric = parseNric(applicantNric);

  if (!validateNric(applicantNric) || !parsedNric) {
    return { error: 'Applicant NRIC is invalid' };
  }

  // The IC is the authoritative source for the age band: re-derive it from the
  // parsed date of birth so a tampered payload cannot price against a cheaper
  // band, and reject applicants past the last entry age (65).
  const applicantAge = getAgeFromDob(parsedNric.dob);
  const ageBand = applicantAge !== null ? getAgeBandForAge(applicantAge) : null;

  if (ageBand === null) {
    return {
      error: `The last entry age for Allianz Shield Plus is ${LAST_ENTRY_AGE} years old.`
    };
  }

  const premium = getAnnualPremium(
    plan.code,
    ageBand,
    selectedPlan.occupationCategory
  );

  if (premium === null) {
    return { error: 'Selected plan is not available for this occupation category' };
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

  const annualIncome = parseAnnualIncome(applicant.annualIncome);

  if (annualIncome === null) {
    return { error: 'Applicant annual income is required' };
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
    ageBand,
    premium,
    mobile,
    parsedNric,
    annualIncome
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
    const db = getDb();
    const paymentProvider = await getRuntimePaymentProvider(db);
    const orderId = generateOrderId();
    const baseUrl = publicBaseUrl();
    const metaBrowserSignals = getMetaBrowserSignals(request, baseUrl);
    const metaInitiateCheckoutEventId = `initiate_checkout_${orderId}`;
    const premiumBreakdown = getPremiumBreakdown(validated.premium);
    const { serviceTax, stampDuty, subtotal } = premiumBreakdown;

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

    const payableBreakdown = getRoundedPayableAmount(
      subtotal,
      appliedPromo?.discountAmount ?? 0
    );
    const totalPayable = payableBreakdown.amount;
    const amount = formatAmount(totalPayable);
    const detail = sanitizeDetail(`Allianz_Shield_Plus_${validated.plan.name}_${orderId}`);
    const trackerToken = crypto.randomUUID();
    const nricHashPepper = getNricHashPepper();
    const underwriting = getUnderwritingAssessment(validated.applicant);
    const senangPayConfig =
      paymentProvider === 'senangpay' ? getSenangPayConfig() : null;
    const dokuCheckout =
      paymentProvider === 'doku'
        ? await createDokuCheckoutPayment({
            orderId,
            amount: totalPayable,
            detail,
            customer: {
              name: validated.applicant.name?.trim() ?? '',
              email: validated.applicant.email?.trim().toLowerCase() ?? '',
              phone: validated.mobile,
              address: validated.applicant.address?.trim()
            },
            baseUrl
          })
        : null;
    const senangPayHash = senangPayConfig
      ? generatePaymentHash({
          secret: senangPayConfig.secret,
          detail,
          amount,
          orderId
        })
      : null;

    await db.collection('applications').doc(orderId).set({
      status: 'applied',
      applicant: {
        name: validated.applicant.name?.trim(),
        nric: validated.applicant.nric,
        nricHash: hashNric(validated.applicant.nric ?? '', nricHashPepper),
        dob: validated.parsedNric.dob,
        email: validated.applicant.email?.trim().toLowerCase(),
        mobile: validated.mobile,
        address: validated.applicant.address?.trim(),
        gender: validated.parsedNric.gender,
        occupation: validated.applicant.occupation?.trim(),
        annualIncome: validated.annualIncome,
        smoker: Boolean(validated.applicant.smoker)
      },
      nominees: validated.nominees.map((nominee) => ({
        name: nominee.name?.trim(),
        nric: nominee.nric,
        nricHash: hashNric(nominee.nric ?? '', nricHashPepper),
        relationship: nominee.relationship?.trim(),
        nationality: nominee.nationality?.trim() || 'Malaysian'
      })),
      plan: {
        code: validated.plan.code,
        ageBand: validated.ageBand,
        occupationCategory: payload.plan?.occupationCategory
      },
      premium: {
        amount: totalPayable,
        annualPlanPrice: premiumBreakdown.annualPlanPrice,
        baseAnnualPremium: premiumBreakdown.baseAnnualPremium,
        managedCareOperatingFee: premiumBreakdown.managedCareOperatingFee,
        serviceTax,
        stampDuty,
        subtotal,
        discountAmount: appliedPromo?.discountAmount ?? 0,
        totalBeforeRounding: payableBreakdown.totalBeforeRounding,
        roundingAdjustment: payableBreakdown.roundingAdjustment,
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
        provider: paymentProvider,
        status: 'initiated',
        amount,
        currency: 'MYR',
        detail,
        merchantId: senangPayConfig?.merchantId ?? null,
        dokuClientId: paymentProvider === 'doku' ? process.env.DOKU_CLIENT_ID : null,
        providerInvoiceNumber: dokuCheckout?.invoiceNumber ?? null,
        requestId: dokuCheckout?.requestId ?? null,
        tokenId: dokuCheckout?.tokenId ?? null,
        sessionId: dokuCheckout?.sessionId ?? null,
        providerAmount: dokuCheckout?.providerAmount ?? null,
        paymentUrl: dokuCheckout?.redirectUrl ?? null,
        transactionId: null,
        lastMessage: null,
        hashVerifiedAt: null,
        signatureVerifiedAt: null
      },
      tracking: {
        meta: {
          ...metaBrowserSignals,
          initiateCheckoutEventId: metaInitiateCheckoutEventId
        }
      },
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      paidAt: null,
      issuedAt: null
    });

    await db.collection('applications').doc(orderId).collection('events').add({
      type: 'status_change',
      from: null,
      to: 'applied',
      actor: { kind: 'customer', id: null },
      payload: { source: 'checkout_initiate' },
      at: FieldValue.serverTimestamp()
    });

    const appRef = db.collection('applications').doc(orderId);
    const eventsCol = appRef.collection('events');
    const appliedEmailResult = await triggerLeadReminderEmail({
      orderId,
      application: {
        applicantName: validated.applicant.name?.trim() ?? '',
        applicantEmail: validated.applicant.email?.trim().toLowerCase() ?? '',
        planName: validated.plan.name,
        planCode: validated.plan.code,
        premiumAmount: totalPayable,
        premiumCurrency: 'MYR',
        trackerToken,
      },
      triggeredBy: 'application_applied',
      actorId: 'checkout',
      writeEvent: (data) =>
        eventsCol.add({ ...data, at: FieldValue.serverTimestamp() }).then(() => undefined),
    });

    if (appliedEmailResult.ok) {
      await appRef.update({
        reminderSent: true,
        updatedAt: FieldValue.serverTimestamp(),
      });
    } else {
      console.error('application_applied_email_failed', {
        orderId,
        error: appliedEmailResult.error,
      });
    }

    await sendMetaCapiEvent({
      eventName: 'InitiateCheckout',
      eventId: metaInitiateCheckoutEventId,
      eventSourceUrl: metaBrowserSignals.eventSourceUrl ?? baseUrl,
      email: validated.applicant.email?.trim().toLowerCase(),
      phone: validated.mobile,
      browserSignals: metaBrowserSignals,
      customData: {
        value: totalPayable,
        currency: 'MYR',
        content_ids: [validated.plan.code],
        content_name: 'Allianz Shield Plus',
        content_type: 'product',
        order_id: orderId
      }
    });

    const redirectUrl = dokuCheckout
      ? dokuCheckout.redirectUrl
      : buildPaymentUrl({
          merchantId: senangPayConfig!.merchantId,
          paymentBaseUrl: senangPayConfig!.paymentBaseUrl,
          detail,
          amount,
          orderId,
          hash: senangPayHash!,
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
