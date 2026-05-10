export const PROMO_DISCOUNT_TYPES = ['percent', 'fixed'] as const;
export type PromoDiscountType = (typeof PROMO_DISCOUNT_TYPES)[number];
export const MIN_PROMO_PAYABLE_AMOUNT = 2;

export interface PromoCode {
  code: string;
  discountType: PromoDiscountType;
  value: number; // percent (0-100) or amount in MYR
  active: boolean;
  validFrom?: number | null; // unix ms
  validUntil?: number | null;
  usageLimit?: number | null;
  usageCount?: number;
  allowedPlans?: string[]; // empty array = all plans
  allowedCategories?: string[]; // empty array = all categories
  notes?: string | null;
}

export type PromoValidationError =
  | { ok: false; reason: string };

export type PromoValidationSuccess = {
  ok: true;
  code: string;
  discountType: PromoDiscountType;
  value: number;
  discountAmount: number; // in MYR cents-precision (rounded to 2dp)
};

export function normalizePromoCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, '');
}

export function calculateDiscount(
  promo: Pick<PromoCode, 'discountType' | 'value'>,
  baseAmount: number
): number {
  const maxDiscount = Math.max(0, baseAmount - MIN_PROMO_PAYABLE_AMOUNT);

  if (promo.discountType === 'percent') {
    const pct = Math.max(0, Math.min(100, promo.value));
    return Math.min(Math.round(baseAmount * pct) / 100, maxDiscount);
  }
  return Math.min(promo.value, maxDiscount);
}

export function validatePromoForUse(
  promo: PromoCode | null,
  context: { planCode: string; occupationCategory: string; baseAmount: number; now?: number }
): PromoValidationSuccess | PromoValidationError {
  const now = context.now ?? Date.now();

  if (!promo) return { ok: false, reason: 'Promo code not found' };
  if (!promo.active) return { ok: false, reason: 'Promo code is not active' };
  if (promo.validFrom && now < promo.validFrom) {
    return { ok: false, reason: 'Promo code is not yet valid' };
  }
  if (promo.validUntil && now > promo.validUntil) {
    return { ok: false, reason: 'Promo code has expired' };
  }
  if (
    typeof promo.usageLimit === 'number' &&
    typeof promo.usageCount === 'number' &&
    promo.usageCount >= promo.usageLimit
  ) {
    return { ok: false, reason: 'Promo code has reached its usage limit' };
  }
  if (promo.allowedPlans && promo.allowedPlans.length > 0 && !promo.allowedPlans.includes(context.planCode)) {
    return { ok: false, reason: 'Promo code does not apply to the selected plan' };
  }
  if (
    promo.allowedCategories &&
    promo.allowedCategories.length > 0 &&
    !promo.allowedCategories.includes(context.occupationCategory)
  ) {
    return { ok: false, reason: 'Promo code does not apply to this occupation category' };
  }

  const discountAmount = calculateDiscount(promo, context.baseAmount);

  return {
    ok: true,
    code: promo.code,
    discountType: promo.discountType,
    value: promo.value,
    discountAmount
  };
}
