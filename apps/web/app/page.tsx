import Image from 'next/image';
import { ArrowRight, CheckCircle2, FileText, Shield, Sparkles, TrendingUp } from 'lucide-react';
import { PlanShowcase } from '../components/PlanShowcase';

const pdfLinks = [
  { label: 'Brochure', href: '/pdfs/Allianz Shield Plus Brochure.pdf' },
  { label: 'Policy Wording', href: '/pdfs/Policy Wording.pdf' },
  { label: 'Product Disclosure Sheet', href: '/pdfs/Product Disclosure Sheet.pdf' }
];

export default function WebHome() {
  return (
    <main className="min-h-screen bg-surface text-on-surface">
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary text-on-primary">
        <div className="absolute inset-0">
          <Image
            src="/images/shield-plus-brochure-preview.png"
            alt="Allianz Shield Plus brochure cover"
            fill
            priority
            sizes="100vw"
            className="object-cover object-top opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/92 to-tertiary" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 pb-24 pt-36 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/12 px-4 py-2 text-sm font-semibold text-white backdrop-blur">
              Distributed by WF Wealth Management Sdn Bhd
            </div>

            <h1 className="mt-8 font-display text-5xl font-semibold leading-tight text-white sm:text-6xl lg:text-7xl">
              High Coverage,
              <br />
              Low Premium.
            </h1>
            <p className="mt-6 text-lg leading-8 text-on-primary-container sm:text-xl">
              Allianz Shield Plus gives you and your family comprehensive personal accident
              coverage with 19 primary benefits — so you can enjoy every moment with complete
              peace of mind.
            </p>

            <div className="mt-8 flex flex-wrap justify-center gap-3 text-sm text-on-primary-container">
              {[
                'Renewable up to age 80',
                '24/7 Worldwide Coverage',
                '19 Primary Benefits',
                'Fast-tracked Renewal Bonus'
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur"
                >
                  <CheckCircle2 size={15} className="shrink-0 text-secondary-container" />
                  {feature}
                </div>
              ))}
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3">
              <a
                href="#plans"
                className="flex min-h-12 items-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-primary hover:bg-primary-fixed"
              >
                View Plans & Pricing
                <ArrowRight size={17} />
              </a>
              <a
                href="/pdfs/Allianz Shield Plus Brochure.pdf"
                target="_blank"
                rel="noreferrer"
                className="flex min-h-12 items-center gap-2 rounded-full bg-white/12 px-7 text-sm font-semibold text-white backdrop-blur hover:bg-white/20"
              >
                Download Brochure
                <FileText size={17} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Row */}
      <section className="bg-surface-container-lowest px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            {[
              { value: '19', label: 'Primary Benefits' },
              { value: 'RM 2M', label: 'Max Sum Insured' },
              { value: '80', label: 'Renewable Up To Age' },
              { value: '9', label: 'Plans Available' }
            ].map(({ value, label }) => (
              <div key={label} className="text-center">
                <p className="font-display text-4xl font-semibold text-primary sm:text-5xl">
                  {value}
                </p>
                <p className="mt-2 text-sm text-on-surface-variant">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Section */}
      <section id="benefits" className="bg-surface-container-low px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-normal text-secondary">
              Why choose us
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-primary sm:text-5xl">
              Built for accidents, recovery, and long-term protection.
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <div className="rounded-lg bg-surface-container-lowest p-7 shadow-ambient">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="text-primary" size={22} />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-primary">
                Fast-Tracked Growth
              </h3>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                Your principal sum increases up to 20% annually upon renewal, capping at a 100%
                maximum — your coverage grows as your loyalty does.
              </p>
            </div>

            <div className="rounded-lg bg-surface-container-lowest p-7 shadow-ambient">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Shield className="text-primary" size={22} />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-primary">
                19 Primary Benefits
              </h3>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                Comprehensive coverage spanning medical expenses, hospital income, snatch theft,
                kidnapping, miscarriage, and more — across every stage of life.
              </p>
            </div>

            <div className="rounded-lg bg-surface-container-lowest p-7 shadow-ambient">
              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="text-primary" size={22} />
              </div>
              <h3 className="mt-6 font-display text-xl font-semibold text-primary">
                Sum Insured up to RM 2,000,000
              </h3>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                Nine plan tiers ranging from RM 60,000 to RM 2,000,000 principal sum — find the
                right level of protection for your needs and budget.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plans Section */}
      <PlanShowcase />

      {/* How It Works */}
      <section id="how-it-works" className="bg-surface px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-normal text-secondary">
              How it works
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-primary sm:text-5xl">
              Covered in three simple steps.
            </h2>
          </div>

          <div className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              {
                step: '01',
                title: 'Choose Your Plan',
                desc: 'Browse our 9 plans and pick the coverage level that fits your needs and budget.'
              },
              {
                step: '02',
                title: 'Make Payment',
                desc: 'Complete your application and pay securely online. Details submitted directly without paperwork.'
              },
              {
                step: '03',
                title: 'Policy Issued in 1 Business Day',
                desc: 'Your coverage activates immediately after policy issuance — usually within 1 business day.'
              }
            ].map(({ step, title, desc }) => (
              <div key={step}>
                <p className="font-display text-7xl font-bold text-primary/[0.08]">{step}</p>
                <div className="-mt-6 pl-2">
                  <h3 className="font-display text-xl font-semibold text-primary">{title}</h3>
                  <p className="mt-3 text-sm leading-7 text-on-surface-variant">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-primary px-4 py-14 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[1fr_auto] lg:items-start">
            <div>
              <p className="font-display text-lg font-bold text-white">Allianz Shield Plus</p>
              <p className="mt-1 text-sm text-on-primary-container">
                Distributed by WF Wealth Management Sdn Bhd
              </p>
              <p className="mt-5 max-w-sm text-xs leading-6 text-on-primary-container/60">
                All premiums are subject to 8% Service Tax + RM10 Stamp Duty. Valid from 1 March
                2025.
              </p>
            </div>

            <div className="grid gap-8 sm:grid-cols-2">
              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-on-primary-container">
                  Documents
                </p>
                <div className="flex flex-col gap-3">
                  {pdfLinks.map((pdf) => (
                    <a
                      key={pdf.href}
                      href={pdf.href}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 text-sm text-on-primary-container transition hover:text-white"
                    >
                      <FileText size={14} />
                      {pdf.label}
                    </a>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-on-primary-container">
                  Legal
                </p>
                <div className="flex flex-col gap-3">
                  {[
                    { label: 'Privacy Policy', href: '/privacy' },
                    { label: 'Terms & Conditions', href: '/terms' },
                    { label: 'Refund Policy', href: '/refund' }
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      className="text-sm text-on-primary-container transition hover:text-white"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
