'use client';

import { ArrowLeft, ArrowRight, Check, FileText, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import {
  ageBandLabels,
  occupationCategoryLabels,
  type AgeBand,
  type OccupationCategory,
  type Plan,
} from '@asp/pricing';
import { normalizeMobile, validateMobile } from '@asp/shared/mobile';
import { parseNric, validateNric } from '@asp/shared/nric';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OCCUPATIONS = [
  'Accountant',
  'Administrative Officer',
  'Architect',
  'Banker',
  'Business Owner',
  'Civil Engineer',
  'Clerk / Data Entry',
  'Customer Service Representative',
  'Dentist',
  'Doctor / Physician',
  'Driver (private use)',
  'Electrician',
  'Factory Worker',
  'Financial Advisor',
  'Graphic Designer',
  'HR Professional',
  'IT Professional',
  'Lawyer',
  'Lecturer / Professor',
  'Marketing Executive',
  'Mechanic',
  'Nurse',
  'Pharmacist',
  'Plumber',
  'Police / Military',
  'Property Agent',
  'Quantity Surveyor',
  'Retail Worker',
  'Sales Executive',
  'Secretary',
  'Security Guard',
  'Self-employed',
  'Software Engineer',
  'Teacher',
  'Technician',
  'Others',
] as const;

const RELATIONSHIPS = [
  'Spouse',
  'Child',
  'Parent',
  'Sibling',
  'Grandparent',
  'Grandchild',
  'Relative',
  'Others',
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ApplicantForm {
  name: string;
  nric: string;
  dob: string;
  gender: 'M' | 'F' | '';
  email: string;
  mobile: string;
  address: string;
  occupation: string;
  smoker: boolean;
}

interface NomineeForm {
  name: string;
  nric: string;
  relationship: string;
  nationality: string;
}

type FormErrors = Record<string, string>;

const INITIAL_APPLICANT: ApplicantForm = {
  name: '',
  nric: '',
  dob: '',
  gender: '',
  email: '',
  mobile: '',
  address: '',
  occupation: '',
  smoker: false,
};

const EMPTY_NOMINEE: NomineeForm = {
  name: '',
  nric: '',
  relationship: '',
  nationality: 'Malaysian',
};

async function readCheckoutResponse(response: Response) {
  const contentType = response.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    return (await response.json()) as {
      redirectUrl?: string;
      error?: string;
    };
  }

  return {
    error: response.ok
      ? 'Payment response was invalid. Please try again.'
      : 'Unable to initiate payment. Please try again or contact support.',
  };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function validateApplicant(a: ApplicantForm): FormErrors {
  const errors: FormErrors = {};

  if (!a.name.trim() || a.name.trim().length < 2)
    errors.name = 'Please enter your full name as per IC';

  if (!validateNric(a.nric))
    errors.nric = 'Please enter a valid 12-digit Malaysian IC number';

  if (!a.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a.email))
    errors.email = 'Please enter a valid email address';

  if (!a.mobile.trim() || !validateMobile(normalizeMobile(a.mobile)))
    errors.mobile = 'Please enter a valid Malaysian mobile number (e.g. 012-345 6789)';

  if (!a.address.trim() || a.address.trim().length < 10)
    errors.address = 'Please enter your full address';

  if (!a.occupation)
    errors.occupation = 'Please select your occupation';

  return errors;
}

function validateNominees(nominees: NomineeForm[]): FormErrors {
  const errors: FormErrors = {};
  nominees.forEach((n, i) => {
    if (!n.name.trim() || n.name.trim().length < 2)
      errors[`n${i}_name`] = 'Please enter nominee name';
    if (!validateNric(n.nric))
      errors[`n${i}_nric`] = 'Please enter a valid 12-digit Malaysian IC number';
    if (!n.relationship)
      errors[`n${i}_relationship`] = 'Please select relationship';
  });
  return errors;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const fmt = (v: number) =>
  new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: 'MYR',
    maximumFractionDigits: 0,
  }).format(v);

function fmtDate(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

/** Auto-format NRIC digits to YYMMDD-SS-NNNC display. */
function formatNricDigits(digits: string): string {
  if (digits.length <= 6) return digits;
  if (digits.length <= 8) return `${digits.slice(0, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 6)}-${digits.slice(6, 8)}-${digits.slice(8)}`;
}

// ---------------------------------------------------------------------------
// Styling constants
// ---------------------------------------------------------------------------

const inputCls =
  'w-full rounded-lg bg-surface-container-lowest px-4 py-3 text-sm text-on-surface ring-1 ring-outline-variant/15 transition focus:outline-none focus:ring-2 focus:ring-primary/30';

const readOnlyCls =
  'w-full rounded-lg bg-surface-container-low px-4 py-3 text-sm text-on-surface-variant ring-1 ring-outline-variant/15 cursor-default';

const selectCls = `${inputCls} appearance-none bg-[image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2343474e' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")] bg-[right_14px_center] bg-no-repeat pr-10`;

// ---------------------------------------------------------------------------
// Shared UI atoms
// ---------------------------------------------------------------------------

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
        {label}
      </label>
      {children}
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// StepIndicator
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Applicant', 'Nominees', 'Review'];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center">
      {STEP_LABELS.map((label, i) => {
        const num = i + 1;
        const done = num < currentStep;
        const active = num === currentStep;
        return (
          <div key={num} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-bold transition ${
                  done || active ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant'
                }`}
              >
                {done ? <Check size={14} /> : num}
              </div>
              <p
                className={`mt-1.5 text-xs font-semibold ${active ? 'text-primary' : 'text-on-surface-variant'}`}
              >
                {label}
              </p>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={`mx-3 mb-5 h-px flex-1 transition ${num < currentStep ? 'bg-primary' : 'bg-surface-container-highest'}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// OrderSummary sidebar
// ---------------------------------------------------------------------------

function OrderSummary({
  plan,
  ageBand,
  occupationCategory,
  premium,
}: {
  plan: Plan;
  ageBand: AgeBand;
  occupationCategory: OccupationCategory;
  premium: number;
}) {
  const sst = Math.round(premium * 0.08);
  const stampDuty = 10;
  const total = premium + sst + stampDuty;

  return (
    <div className="rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
      <p className="text-xs font-semibold uppercase tracking-wide text-secondary">Your selection</p>
      <h3 className="mt-2 font-display text-2xl font-semibold text-primary">{plan.name}</h3>
      <p className="mt-1 text-sm text-on-surface-variant">Allianz Shield Plus</p>

      <div className="mt-5 grid gap-3 text-sm">
        <SummaryRow label="Sum Assured" value={fmt(plan.sumAssured)} />
        <SummaryRow label="Medical Expenses" value={fmt(plan.medicalExpenses)} />
        <SummaryRow label="Renewal Bonus" value={`Up to ${plan.renewalBonus.percent}%`} />
      </div>

      <div className="my-5 h-px bg-surface-container-highest" />

      <div className="grid gap-2 text-sm">
        <SummaryRow label="Annual Premium" value={fmt(premium)} />
        <SummaryRow label="8% Service Tax" value={fmt(sst)} />
        <SummaryRow label="Stamp Duty" value={`RM ${stampDuty}`} />
      </div>

      <div className="mt-4 rounded-lg bg-primary/5 px-4 py-3">
        <p className="text-xs text-on-surface-variant">Total payable</p>
        <p className="mt-1 font-display text-3xl font-semibold text-primary">{fmt(total)}</p>
        <p className="mt-0.5 text-xs text-on-surface-variant">≈ {fmt(Math.ceil(total / 12))} / month</p>
      </div>

      <div className="mt-5 grid gap-1.5 text-xs text-on-surface-variant">
        <p>{ageBandLabels[ageBand]}</p>
        <p>{occupationCategoryLabels[occupationCategory]}</p>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        {[
          { label: 'Brochure', href: '/pdfs/Allianz Shield Plus Brochure.pdf' },
          { label: 'Policy Wording', href: '/pdfs/Policy Wording.pdf' },
          { label: 'Product Disclosure Sheet', href: '/pdfs/Product Disclosure Sheet.pdf' },
        ].map((pdf) => (
          <a
            key={pdf.href}
            href={pdf.href}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-on-surface-variant hover:text-primary"
          >
            <FileText size={13} />
            {pdf.label}
          </a>
        ))}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-on-surface-variant">{label}</span>
      <span className="font-semibold text-primary">{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main ApplicationForm component
// ---------------------------------------------------------------------------

interface Props {
  plan: Plan;
  ageBand: AgeBand;
  occupationCategory: OccupationCategory;
  premium: number;
}

export function ApplicationForm({ plan, ageBand, occupationCategory, premium }: Props) {
  const [step, setStep] = useState(1);
  const [applicant, setApplicant] = useState<ApplicantForm>(INITIAL_APPLICANT);
  const [nominees, setNominees] = useState<NomineeForm[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [pdpaConsent, setPdpaConsent] = useState(false);
  const [pdpaError, setPdpaError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ---- Applicant handlers ----

  function setField<K extends keyof ApplicantForm>(field: K, value: ApplicantForm[K]) {
    setApplicant((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => { const next = { ...prev }; delete next[field]; return next; });
  }

  function handleNricChange(raw: string) {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 12);
    const formatted = formatNricDigits(digits);
    const parsed = digits.length === 12 ? parseNric(digits) : null;
    setApplicant((prev) => ({
      ...prev,
      nric: formatted,
      dob: parsed ? parsed.dob : '',
      gender: parsed ? parsed.gender : '',
    }));
    if (errors.nric) setErrors((prev) => { const next = { ...prev }; delete next.nric; return next; });
  }

  function handleMobileBlur() {
    if (!applicant.mobile.trim()) return;
    const normalized = normalizeMobile(applicant.mobile);
    if (validateMobile(normalized)) {
      setApplicant((prev) => ({ ...prev, mobile: normalized }));
    }
  }

  // ---- Nominee handlers ----

  function addNominee() {
    if (nominees.length < 2) setNominees((prev) => [...prev, { ...EMPTY_NOMINEE }]);
  }

  function removeNominee(i: number) {
    setNominees((prev) => prev.filter((_, idx) => idx !== i));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[`n${i}_name`];
      delete next[`n${i}_nric`];
      delete next[`n${i}_relationship`];
      return next;
    });
  }

  function updateNominee<K extends keyof NomineeForm>(i: number, field: K, value: NomineeForm[K]) {
    setNominees((prev) => prev.map((n, idx) => (idx === i ? { ...n, [field]: value } : n)));
    const key = `n${i}_${field}`;
    if (errors[key]) setErrors((prev) => { const next = { ...prev }; delete next[key]; return next; });
  }

  function handleNomineeNricChange(i: number, raw: string) {
    const digits = raw.replace(/[^0-9]/g, '').slice(0, 12);
    updateNominee(i, 'nric', formatNricDigits(digits));
  }

  // ---- Navigation ----

  function handleNext() {
    if (step === 1) {
      const errs = validateApplicant(applicant);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    if (step === 2) {
      const errs = validateNominees(nominees);
      if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    }
    setErrors({});
    setStep((s) => s + 1);
  }

  function handleBack() {
    setErrors({});
    setStep((s) => s - 1);
  }

  async function handleSubmit() {
    if (!pdpaConsent) {
      setPdpaError('You must agree to the PDPA consent to proceed');
      return;
    }
    setPdpaError('');
    setSubmitError('');
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/checkout/initiate', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          applicant,
          nominees,
          plan: {
            code: plan.code,
            ageBand,
            occupationCategory,
          },
          pdpaConsent: {
            accepted: pdpaConsent,
            version: 'v1',
          },
        }),
      });

      const result = await readCheckoutResponse(response);

      if (!response.ok || !result.redirectUrl) {
        throw new Error(result.error ?? 'Unable to initiate payment');
      }

      window.location.assign(result.redirectUrl);
    } catch (error) {
      setSubmitError(
        error instanceof Error
          ? error.message
          : 'Unable to initiate payment. Please try again.'
      );
      setIsSubmitting(false);
    }
  }

  // ---- Render ----

  return (
    <main className="min-h-screen bg-surface pb-20 pt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <Link
            href="/#plans"
            className="inline-flex items-center gap-2 text-sm text-on-surface-variant transition hover:text-primary"
          >
            <ArrowLeft size={15} />
            Back to plans
          </Link>
          <h1 className="mt-4 font-display text-3xl font-semibold text-primary sm:text-4xl">
            Apply for Allianz Shield Plus
          </h1>
          <p className="mt-2 text-sm text-on-surface-variant">
            Complete the form below — your details are used to issue your policy.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
          {/* Form column */}
          <div>
            <StepIndicator currentStep={step} />

            <div className="mt-8">
              {/* ---- Step 1: Applicant Details ---- */}
              {step === 1 && (
                <div className="rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
                  <h2 className="font-display text-xl font-semibold text-primary">
                    Applicant Details
                  </h2>
                  <p className="mt-1 text-sm text-on-surface-variant">
                    Enter your personal details exactly as they appear on your MyKad.
                  </p>

                  <div className="mt-6 grid gap-5">
                    {/* Full name */}
                    <FormField label="Full Name (as per IC)" error={errors.name}>
                      <input
                        type="text"
                        value={applicant.name}
                        onChange={(e) => setField('name', e.target.value)}
                        placeholder="e.g. Ahmad bin Abdullah"
                        className={inputCls}
                      />
                    </FormField>

                    {/* NRIC + DOB */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField label="Malaysian IC Number" error={errors.nric}>
                        <input
                          type="text"
                          value={applicant.nric}
                          onChange={(e) => handleNricChange(e.target.value)}
                          placeholder="901231-14-1234"
                          inputMode="numeric"
                          className={inputCls}
                        />
                      </FormField>
                      <FormField label="Date of Birth">
                        <input
                          type="text"
                          value={fmtDate(applicant.dob)}
                          readOnly
                          placeholder="Auto-filled from IC"
                          className={readOnlyCls}
                        />
                      </FormField>
                    </div>

                    {/* Gender + Email */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField label="Gender">
                        <input
                          type="text"
                          value={
                            applicant.gender === 'M'
                              ? 'Male'
                              : applicant.gender === 'F'
                                ? 'Female'
                                : ''
                          }
                          readOnly
                          placeholder="Auto-filled from IC"
                          className={readOnlyCls}
                        />
                      </FormField>
                      <FormField label="Email Address" error={errors.email}>
                        <input
                          type="email"
                          value={applicant.email}
                          onChange={(e) => setField('email', e.target.value)}
                          placeholder="you@example.com"
                          className={inputCls}
                        />
                      </FormField>
                    </div>

                    {/* Mobile + Occupation */}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <FormField label="Mobile Number" error={errors.mobile}>
                        <input
                          type="tel"
                          value={applicant.mobile}
                          onChange={(e) => setField('mobile', e.target.value)}
                          onBlur={handleMobileBlur}
                          placeholder="012-345 6789"
                          className={inputCls}
                        />
                      </FormField>
                      <FormField label="Occupation" error={errors.occupation}>
                        <select
                          value={applicant.occupation}
                          onChange={(e) => setField('occupation', e.target.value)}
                          className={selectCls}
                        >
                          <option value="">Select occupation</option>
                          {OCCUPATIONS.map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                      </FormField>
                    </div>

                    {/* Address */}
                    <FormField label="Home Address" error={errors.address}>
                      <textarea
                        value={applicant.address}
                        onChange={(e) => setField('address', e.target.value)}
                        placeholder="No. 1, Jalan Example, 50000 Kuala Lumpur"
                        rows={3}
                        className={`${inputCls} resize-none`}
                      />
                    </FormField>

                    {/* Smoker toggle */}
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-on-surface-variant">
                        Smoker Status
                      </p>
                      <div className="flex gap-3">
                        {[
                          { label: 'Non-smoker', value: false },
                          { label: 'Smoker', value: true },
                        ].map(({ label, value }) => (
                          <button
                            key={label}
                            type="button"
                            onClick={() => setField('smoker', value)}
                            className={`flex min-h-11 flex-1 items-center justify-center rounded-full text-sm font-semibold transition ${
                              applicant.smoker === value
                                ? 'bg-primary text-on-primary'
                                : 'bg-surface-container text-on-surface-variant hover:bg-primary-fixed/40'
                            }`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ---- Step 2: Nominee Details ---- */}
              {step === 2 && (
                <div className="grid gap-5">
                  <div className="rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
                    <h2 className="font-display text-xl font-semibold text-primary">
                      Nominee Details
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      You may add up to 2 nominees. This step is optional.
                    </p>

                    {nominees.length === 0 && (
                      <div className="mt-6 rounded-lg bg-surface-container-low px-5 py-8 text-center">
                        <p className="text-sm text-on-surface-variant">No nominees added yet.</p>
                        <p className="mt-1 text-xs text-on-surface-variant">
                          You can proceed without adding a nominee.
                        </p>
                      </div>
                    )}

                    {nominees.map((nominee, i) => (
                      <div
                        key={i}
                        className="mt-5 rounded-lg bg-surface-container-low p-5"
                      >
                        <div className="mb-4 flex items-center justify-between">
                          <p className="text-sm font-semibold text-primary">
                            Nominee {i + 1}
                          </p>
                          <button
                            type="button"
                            onClick={() => removeNominee(i)}
                            className="flex size-8 items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-highest hover:text-primary"
                            aria-label={`Remove nominee ${i + 1}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="grid gap-4">
                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Full Name" error={errors[`n${i}_name`]}>
                              <input
                                type="text"
                                value={nominee.name}
                                onChange={(e) => updateNominee(i, 'name', e.target.value)}
                                placeholder="Nominee full name"
                                className={inputCls}
                              />
                            </FormField>
                            <FormField label="IC Number" error={errors[`n${i}_nric`]}>
                              <input
                                type="text"
                                value={nominee.nric}
                                onChange={(e) => handleNomineeNricChange(i, e.target.value)}
                                placeholder="901231-14-1234"
                                inputMode="numeric"
                                className={inputCls}
                              />
                            </FormField>
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <FormField label="Relationship" error={errors[`n${i}_relationship`]}>
                              <select
                                value={nominee.relationship}
                                onChange={(e) =>
                                  updateNominee(i, 'relationship', e.target.value)
                                }
                                className={selectCls}
                              >
                                <option value="">Select relationship</option>
                                {RELATIONSHIPS.map((r) => (
                                  <option key={r} value={r}>
                                    {r}
                                  </option>
                                ))}
                              </select>
                            </FormField>
                            <FormField label="Nationality">
                              <input
                                type="text"
                                value={nominee.nationality}
                                onChange={(e) => updateNominee(i, 'nationality', e.target.value)}
                                className={inputCls}
                              />
                            </FormField>
                          </div>
                        </div>
                      </div>
                    ))}

                    {nominees.length < 2 && (
                      <button
                        type="button"
                        onClick={addNominee}
                        className="mt-5 flex w-full items-center justify-center gap-2 rounded-full bg-primary-fixed/40 py-3 text-sm font-semibold text-primary transition hover:bg-primary-fixed"
                      >
                        <Plus size={16} />
                        Add Nominee {nominees.length === 1 ? '2' : ''}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* ---- Step 3: Review & PDPA ---- */}
              {step === 3 && (
                <div className="grid gap-5">
                  {/* Applicant summary */}
                  <div className="rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
                    <h2 className="font-display text-xl font-semibold text-primary">
                      Review Your Application
                    </h2>
                    <p className="mt-1 text-sm text-on-surface-variant">
                      Please verify your details before proceeding to payment.
                    </p>

                    <div className="mt-5">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                        Applicant
                      </p>
                      <div className="grid gap-3 text-sm sm:grid-cols-2">
                        <ReviewRow label="Full Name" value={applicant.name} />
                        <ReviewRow label="IC Number" value={applicant.nric} />
                        <ReviewRow label="Date of Birth" value={fmtDate(applicant.dob)} />
                        <ReviewRow
                          label="Gender"
                          value={applicant.gender === 'M' ? 'Male' : 'Female'}
                        />
                        <ReviewRow label="Email" value={applicant.email} />
                        <ReviewRow label="Mobile" value={applicant.mobile} />
                        <ReviewRow label="Occupation" value={applicant.occupation} />
                        <ReviewRow
                          label="Smoker"
                          value={applicant.smoker ? 'Yes' : 'No'}
                        />
                        <div className="sm:col-span-2">
                          <ReviewRow label="Address" value={applicant.address} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Nominees summary */}
                  {nominees.length > 0 && (
                    <div className="rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-secondary">
                        Nominees
                      </p>
                      <div className="grid gap-5">
                        {nominees.map((n, i) => (
                          <div key={i}>
                            <p className="mb-2 text-sm font-semibold text-primary">
                              Nominee {i + 1}
                            </p>
                            <div className="grid gap-3 text-sm sm:grid-cols-2">
                              <ReviewRow label="Name" value={n.name} />
                              <ReviewRow label="IC Number" value={n.nric} />
                              <ReviewRow label="Relationship" value={n.relationship} />
                              <ReviewRow label="Nationality" value={n.nationality} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* PDPA consent */}
                  <div className="rounded-lg bg-surface-container-lowest p-6 shadow-ambient">
                    <p className="text-xs font-semibold uppercase tracking-wide text-secondary">
                      PDPA Consent
                    </p>
                    <label className="mt-4 flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={pdpaConsent}
                        onChange={(e) => {
                          setPdpaConsent(e.target.checked);
                          if (e.target.checked) setPdpaError('');
                        }}
                        className="mt-0.5 size-4 shrink-0 rounded accent-primary"
                      />
                      <span className="text-sm leading-6 text-on-surface-variant">
                        I consent to the collection, use, and disclosure of my personal data
                        by WF Wealth Management Sdn Bhd and Allianz General Insurance Company
                        (Malaysia) Berhad for the purpose of processing this insurance
                        application, as described in the{' '}
                        <a href="/privacy-policy" className="text-secondary underline hover:no-underline">
                          Privacy Policy
                        </a>
                        .
                      </span>
                    </label>
                    {pdpaError && (
                      <p className="mt-2 text-xs text-red-600">{pdpaError}</p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Navigation buttons */}
            <div className="mt-6 flex gap-3">
              {step > 1 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex min-h-11 items-center gap-2 rounded-full bg-surface-container px-6 text-sm font-semibold text-primary transition hover:bg-primary-fixed"
                >
                  <ArrowLeft size={15} />
                  Back
                </button>
              )}
              {step < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-on-primary transition hover:bg-secondary sm:flex-initial"
                >
                  Continue
                  <ArrowRight size={15} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-8 text-sm font-semibold text-on-primary transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-60 sm:flex-initial"
                >
                  {isSubmitting ? 'Starting payment...' : 'Proceed to Payment'}
                  <ArrowRight size={15} />
                </button>
              )}
            </div>
            {submitError && (
              <p className="mt-3 text-sm font-semibold text-red-600">{submitError}</p>
            )}
          </div>

          {/* Sidebar */}
          <aside className="order-first lg:order-none lg:sticky lg:top-24">
            <OrderSummary
              plan={plan}
              ageBand={ageBand}
              occupationCategory={occupationCategory}
              premium={premium}
            />
          </aside>
        </div>
      </div>
    </main>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-on-surface-variant">{label}</p>
      <p className="mt-0.5 font-semibold text-on-surface">{value || '—'}</p>
    </div>
  );
}
