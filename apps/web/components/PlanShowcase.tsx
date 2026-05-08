'use client';

import { ArrowRight, BadgeCheck, ChevronDown, Info, X } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ageBandLabels,
  categoryBAvailabilityMessage,
  commonBenefits,
  getAnnualPremium,
  getSelectablePlans,
  occupationCategoryLabels,
  type AgeBand,
  type OccupationCategory,
  plans
} from '@asp/pricing';

const occupationDetails = [
  {
    label: 'Category A',
    text: 'Professional, administrative, managerial, sales, supervisory, non-travelling roles, and work with less than 50% manual labour.'
  },
  {
    label: 'Category B',
    text: 'Skilled or semi-skilled work using equipment or machinery, exposed to some hazardous conditions, or with more than 50% manual labour.'
  }
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0
  }).format(value);

export function PlanShowcase() {
  const [ageBand, setAgeBand] = useState<AgeBand>('age_50_and_below');
  const [occupationCategory, setOccupationCategory] = useState<OccupationCategory>('A');
  const [showBenefits, setShowBenefits] = useState(false);
  const [isOccupationModalOpen, setIsOccupationModalOpen] = useState(false);

  const selectablePlans = useMemo(
    () => getSelectablePlans(ageBand, occupationCategory),
    [ageBand, occupationCategory]
  );

  const hiddenPlanCount = plans.length - selectablePlans.length;

  return (
    <>
      <section id="plans" className="bg-surface-container-low px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-8 lg:grid-cols-[0.92fr_1.08fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-secondary">
                Plans & pricing
              </p>
              <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold text-primary sm:text-5xl">
                Choose cover that matches your work and life stage.
              </h2>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-full bg-surface-container-high p-1">
                {(['age_50_and_below', 'age_51_to_65'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setAgeBand(option)}
                    className={`min-h-11 w-1/2 rounded-full px-4 text-sm font-semibold transition ${
                      ageBand === option
                        ? 'bg-primary text-on-primary shadow-ambient'
                        : 'text-on-surface-variant hover:bg-primary-fixed/30'
                    }`}
                  >
                    {option === 'age_50_and_below' ? 'Below 50' : '51–65'}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 rounded-full bg-surface-container-high p-1">
                {(['A', 'B'] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setOccupationCategory(option)}
                    className={`min-h-11 flex-1 rounded-full px-4 text-sm font-semibold transition ${
                      occupationCategory === option
                        ? 'bg-primary text-on-primary shadow-ambient'
                        : 'text-on-surface-variant hover:bg-primary-fixed/30'
                    }`}
                  >
                    Cat {option}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setIsOccupationModalOpen(true)}
                  className="flex size-11 items-center justify-center rounded-full text-primary hover:bg-primary-fixed/40"
                  aria-label="View occupation categories"
                  title="View occupation categories"
                >
                  <Info size={18} />
                </button>
              </div>
            </div>
          </div>

          {occupationCategory === 'B' && (
            <div className="mt-6 flex items-start gap-3 rounded-lg bg-surface-container-lowest px-5 py-4 text-sm text-on-surface-variant shadow-ambient">
              <BadgeCheck className="mt-0.5 shrink-0 text-secondary" size={18} />
              <p>
                {categoryBAvailabilityMessage} {hiddenPlanCount} higher-value plans are hidden for
                this selection.
              </p>
            </div>
          )}

          <div className="mt-8 flex gap-5 overflow-x-auto pb-4 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {selectablePlans.map((plan, index) => {
              const premium = getAnnualPremium(plan.code, ageBand, occupationCategory);
              const monthlyEquivalent =
                premium !== null ? Math.ceil(premium / 12) : null;
              const isExpanded = showBenefits;

              return (
                <article
                  key={plan.code}
                  className="w-80 shrink-0 overflow-hidden rounded-lg bg-surface-container-lowest shadow-ambient"
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-secondary">{plan.name}</p>
                        <h3 className="mt-2 font-display text-3xl font-semibold text-primary">
                          {formatCurrency(plan.sumAssured)}
                        </h3>
                      </div>
                      {index === 2 && (
                        <span className="rounded-full bg-secondary-container px-3 py-1 text-xs font-semibold text-on-secondary-container">
                          Popular
                        </span>
                      )}
                    </div>

                    <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-lg bg-surface-container-low px-4 py-3">
                        <p className="text-on-surface-variant">Medical expenses</p>
                        <p className="mt-1 font-semibold text-primary">
                          {formatCurrency(plan.medicalExpenses)}
                        </p>
                      </div>
                      <div className="rounded-lg bg-surface-container-low px-4 py-3">
                        <p className="text-on-surface-variant">Renewal bonus</p>
                        <p className="mt-1 font-semibold text-primary">
                          Up to {plan.renewalBonus.percent}%
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <p className="text-sm text-on-surface-variant">Annual premium</p>
                      <p className="mt-1 font-display text-4xl font-semibold text-primary">
                        {premium === null ? 'N/A' : formatCurrency(premium)}
                      </p>
                      {monthlyEquivalent !== null && (
                        <p className="mt-1 text-sm text-on-surface-variant">
                          ≈ {formatCurrency(monthlyEquivalent)} / month
                        </p>
                      )}
                      <p className="mt-2 text-xs text-on-surface-variant">
                        {ageBandLabels[ageBand]} · {occupationCategoryLabels[occupationCategory]}
                      </p>
                    </div>

                    <div className="mt-6 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={() => setShowBenefits(!showBenefits)}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary-fixed/40 px-4 text-sm font-semibold text-primary hover:bg-primary-fixed"
                      >
                        {isExpanded ? 'Hide Plan' : 'View Plan'}
                        <ChevronDown
                          size={17}
                          className={`transition ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                      <Link
                        href={`/apply?plan=${plan.code}&ageBand=${ageBand}&occupationCategory=${occupationCategory}`}
                        className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-semibold text-on-primary transition hover:bg-secondary"
                      >
                        Choose this plan
                        <ArrowRight size={17} />
                      </Link>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="bg-surface-container-highest px-6 py-5">
                      <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-secondary">
                        All 19 Benefits
                      </p>
                      <div className="grid gap-3 text-sm text-on-surface-variant">
                        <BenefitLine
                          label="Accidental death / permanent disablement"
                          value={formatCurrency(plan.sumAssured)}
                        />
                        <BenefitLine
                          label="Medical expenses"
                          value={formatCurrency(plan.medicalExpenses)}
                        />
                        <BenefitLine
                          label="Hospital income"
                          value={`${formatCurrency(commonBenefits.hospitalIncomePerDayMax180Days[index])} per day, max 180 days`}
                        />
                        <BenefitLine
                          label="Alternative medicine"
                          value={formatCurrency(commonBenefits.alternativeMedicine.planValues[index])}
                        />
                        <BenefitLine
                          label="Renewal bonus"
                          value={`Up to ${plan.renewalBonus.percent}% of Principal Sum Insured`}
                        />
                        <BenefitLine
                          label="Blood transfusion"
                          value={commonBenefits.bloodTransfusion}
                        />
                        <BenefitLine
                          label="Dental correction & corrective cosmetic surgery"
                          value={formatCurrency(commonBenefits.dentalCorrectionAndCorrectiveCosmeticSurgery)}
                        />
                        <BenefitLine
                          label="Permanent impotency or infertility"
                          value={commonBenefits.permanentImpotencyOrInfertility}
                        />
                        <BenefitLine
                          label="Kidnap expense & reward"
                          value={`${formatCurrency(commonBenefits.kidnap.expense)} expense · ${formatCurrency(commonBenefits.kidnap.reward)} reward`}
                        />
                        <BenefitLine
                          label="Ambulance fee"
                          value={formatCurrency(commonBenefits.ambulanceFee)}
                        />
                        <BenefitLine
                          label="Funeral expenses"
                          value={formatCurrency(commonBenefits.funeralExpenses)}
                        />
                        <BenefitLine
                          label="Bereavement allowance"
                          value={commonBenefits.bereavementAllowance}
                        />
                        <BenefitLine
                          label="Personal liability"
                          value={commonBenefits.personalLiability}
                        />
                        <BenefitLine
                          label="Mobility expenses"
                          value={formatCurrency(commonBenefits.mobilityExpenses)}
                        />
                        <BenefitLine
                          label="Repatriation expenses"
                          value={formatCurrency(commonBenefits.repatriationExpenses)}
                        />
                        <BenefitLine
                          label="Miscarriage due to accident"
                          value={formatCurrency(commonBenefits.miscarriageDueToAccident)}
                        />
                        <BenefitLine
                          label="Compassionate care"
                          value={formatCurrency(commonBenefits.compassionateCare)}
                        />
                        <BenefitLine
                          label="Snatch theft / attempted snatch theft"
                          value={formatCurrency(commonBenefits.snatchTheftOrAttemptedSnatchTheft)}
                        />
                        <BenefitLine
                          label="Double indemnity"
                          value={commonBenefits.doubleIndemnity}
                        />
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {isOccupationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-primary/35 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-normal text-secondary">
                  Occupation categories
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold text-primary">
                  Select the category that best matches the applicant.
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsOccupationModalOpen(false)}
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-container-low text-primary hover:bg-primary-fixed"
                aria-label="Close occupation categories"
              >
                <X size={18} />
              </button>
            </div>
            <div className="mt-6 grid gap-4">
              {occupationDetails.map((category) => (
                <div
                  key={category.label}
                  className="rounded-lg bg-surface-container-low px-5 py-4"
                >
                  <p className="font-semibold text-primary">{category.label}</p>
                  <p className="mt-2 text-sm leading-6 text-on-surface-variant">{category.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function BenefitLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[0.7fr_1fr] sm:gap-4">
      <p className="font-semibold text-primary">{label}</p>
      <p>{value}</p>
    </div>
  );
}
