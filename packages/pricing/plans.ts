export const AGE_BANDS = ['age_50_and_below', 'age_51_to_65'] as const;
export const OCCUPATION_CATEGORIES = ['A', 'B'] as const;

export type AgeBand = (typeof AGE_BANDS)[number];
export type OccupationCategory = (typeof OCCUPATION_CATEGORIES)[number];

export type PremiumMatrix = Record<
  OccupationCategory,
  Record<AgeBand, number | null>
>;

export type Plan = {
  code: string;
  name: string;
  online: boolean;
  sumAssured: number;
  medicalExpenses: number;
  renewalBonus: {
    type: 'up_to_percent_of_sum_assured';
    percent: number;
  };
  annualPremium: PremiumMatrix;
};

export const ageBandLabels: Record<AgeBand, string> = {
  age_50_and_below: 'Age 50 years and below',
  age_51_to_65: 'Age 51 years to 65 years'
};

export const occupationCategoryLabels: Record<OccupationCategory, string> = {
  A: 'Occupational Category A',
  B: 'Occupational Category B'
};

export const categoryBAvailabilityMessage =
  'Category B is only available to buy Plans 1 to 5.';

export const commonBenefits = {
  alternativeMedicine: {
    planValues: [350, 400, 450, 500, 550, 600, 650, 700, 750]
  },
  bloodTransfusion: '20% of Principal Sum Insured',
  dentalCorrectionAndCorrectiveCosmeticSurgery: 5000,
  hospitalIncomePerDayMax180Days: [85, 85, 85, 110, 110, 185, 185, 235, 250],
  permanentImpotencyOrInfertility: '20% of Principal Sum Insured',
  kidnap: {
    expense: 10000,
    reward: 50000
  },
  ambulanceFee: 500,
  funeralExpenses: 5000,
  bereavementAllowance: '20% of Principal Sum Insured',
  personalLiability: 'Three times of Principal Sum Insured',
  mobilityExpenses: 2000,
  repatriationExpenses: 20000,
  miscarriageDueToAccident: 2000,
  compassionateCare: 10000,
  snatchTheftOrAttemptedSnatchTheft: 600,
  doubleIndemnity:
    'Two times of Principal Sum Insured together with Renewal Bonus'
} as const;

export const plans = [
  {
    code: 'plan_1',
    name: 'Plan 1',
    online: true,
    sumAssured: 60000,
    medicalExpenses: 3500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 103, age_51_to_65: 123 },
      B: { age_50_and_below: 168, age_51_to_65: 201 }
    }
  },
  {
    code: 'plan_2',
    name: 'Plan 2',
    online: true,
    sumAssured: 120000,
    medicalExpenses: 4500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 177, age_51_to_65: 212 },
      B: { age_50_and_below: 273, age_51_to_65: 327 }
    }
  },
  {
    code: 'plan_3',
    name: 'Plan 3',
    online: true,
    sumAssured: 180000,
    medicalExpenses: 5500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 229, age_51_to_65: 275 },
      B: { age_50_and_below: 389, age_51_to_65: 467 }
    }
  },
  {
    code: 'plan_4',
    name: 'Plan 4',
    online: true,
    sumAssured: 240000,
    medicalExpenses: 6500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 303, age_51_to_65: 363 },
      B: { age_50_and_below: 525, age_51_to_65: 630 }
    }
  },
  {
    code: 'plan_5',
    name: 'Plan 5',
    online: true,
    sumAssured: 360000,
    medicalExpenses: 7500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 418, age_51_to_65: 501 },
      B: { age_50_and_below: 788, age_51_to_65: 945 }
    }
  },
  {
    code: 'plan_6',
    name: 'Plan 6',
    online: true,
    sumAssured: 600000,
    medicalExpenses: 8500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 670, age_51_to_65: 804 },
      B: { age_50_and_below: null, age_51_to_65: null }
    }
  },
  {
    code: 'plan_7',
    name: 'Plan 7',
    online: true,
    sumAssured: 900000,
    medicalExpenses: 9500,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 943, age_51_to_65: 1131 },
      B: { age_50_and_below: null, age_51_to_65: null }
    }
  },
  {
    code: 'plan_8',
    name: 'Plan 8',
    online: true,
    sumAssured: 1200000,
    medicalExpenses: 10000,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 1248, age_51_to_65: 1497 },
      B: { age_50_and_below: null, age_51_to_65: null }
    }
  },
  {
    code: 'plan_9',
    name: 'Plan 9',
    online: true,
    sumAssured: 2000000,
    medicalExpenses: 12000,
    renewalBonus: { type: 'up_to_percent_of_sum_assured', percent: 100 },
    annualPremium: {
      A: { age_50_and_below: 1816, age_51_to_65: 2179 },
      B: { age_50_and_below: null, age_51_to_65: null }
    }
  }
] as const satisfies readonly Plan[];

export type PlanCode = (typeof plans)[number]['code'];

export const MANAGED_CARE_OPERATING_FEE = 1.1;
export const SERVICE_TAX_RATE = 0.08;
export const STAMP_DUTY_THRESHOLD = 150;
export const STAMP_DUTY_AMOUNT = 10;
export const CASH_ROUNDING_INCREMENT = 0.05;

export function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function roundDownToCashIncrement(
  value: number,
  increment = CASH_ROUNDING_INCREMENT
) {
  return roundCurrency(Math.floor((value + Number.EPSILON) / increment) * increment);
}

export function getRoundedPayableAmount(subtotal: number, discountAmount = 0) {
  const totalBeforeRounding = Math.max(
    0,
    roundCurrency(subtotal - discountAmount)
  );
  const amount = roundDownToCashIncrement(totalBeforeRounding);
  const roundingAdjustment = roundCurrency(totalBeforeRounding - amount);

  return {
    amount,
    totalBeforeRounding,
    roundingAdjustment
  };
}

export function getPremiumBreakdown(annualPlanPrice: number) {
  const baseAnnualPremium = roundCurrency(
    annualPlanPrice - MANAGED_CARE_OPERATING_FEE
  );
  const managedCareOperatingFee = MANAGED_CARE_OPERATING_FEE;
  const serviceTax = roundCurrency(baseAnnualPremium * SERVICE_TAX_RATE);
  const stampDuty =
    baseAnnualPremium >= STAMP_DUTY_THRESHOLD ? STAMP_DUTY_AMOUNT : 0;
  const subtotal = roundCurrency(
    baseAnnualPremium + managedCareOperatingFee + serviceTax + stampDuty
  );

  return {
    annualPlanPrice,
    baseAnnualPremium,
    managedCareOperatingFee,
    serviceTax,
    stampDuty,
    subtotal
  };
}

export function getAnnualPremium(
  planCode: string,
  ageBand: AgeBand,
  occupationCategory: OccupationCategory
) {
  const plan = plans.find((candidate) => candidate.code === planCode);

  if (!plan) {
    return null;
  }

  return plan.annualPremium[occupationCategory][ageBand];
}

export function isPlanAvailableForSelection(
  planCode: PlanCode,
  ageBand: AgeBand,
  occupationCategory: OccupationCategory
) {
  return getAnnualPremium(planCode, ageBand, occupationCategory) !== null;
}

export function getSelectablePlans(
  ageBand: AgeBand,
  occupationCategory: OccupationCategory
) {
  return plans.filter((plan) =>
    isPlanAvailableForSelection(plan.code, ageBand, occupationCategory)
  );
}

export function getPlanByCode(code: string) {
  return plans.find((plan) => plan.code === code) ?? null;
}

export function planNameFromCode(code: string): string {
  return getPlanByCode(code)?.name ?? code;
}

// ---------------------------------------------------------------------------
// Age / age-band derivation
// ---------------------------------------------------------------------------

/** Last entry age for Allianz Shield Plus. Applicants older than this cannot buy online. */
export const LAST_ENTRY_AGE = 65;

/**
 * Computes age in completed years from an ISO `YYYY-MM-DD` date of birth.
 * Returns null when the string is not a parseable ISO date.
 */
export function getAgeFromDob(
  dob: string,
  asOf: Date = new Date()
): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dob);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  let age = asOf.getFullYear() - year;
  const hadBirthdayThisYear =
    asOf.getMonth() + 1 > month ||
    (asOf.getMonth() + 1 === month && asOf.getDate() >= day);

  if (!hadBirthdayThisYear) age -= 1;
  return age;
}

/**
 * Maps an age to its pricing age band, or null when the applicant is past the
 * last entry age (65) and therefore cannot be sold a plan online.
 */
export function getAgeBandForAge(age: number): AgeBand | null {
  if (age <= 50) return 'age_50_and_below';
  if (age <= LAST_ENTRY_AGE) return 'age_51_to_65';
  return null;
}
