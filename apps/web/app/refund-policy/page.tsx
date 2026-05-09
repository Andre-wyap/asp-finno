import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Refund Policy — Allianz Shield Plus',
  description: 'Premium refund and cancellation guidelines for Allianz Shield Plus, distributed by WF Wealth Management.',
};

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f9fb' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm font-medium mb-10"
          style={{ color: '#006398' }}
        >
          ← Back to home
        </Link>

        <div style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '48px' }}>
          <p className="text-sm font-semibold uppercase tracking-widest mb-2" style={{ color: '#006398' }}>
            WF Wealth Management
          </p>
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#002356', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
            Refund Policy
          </h1>
          <p className="text-sm mb-8" style={{ color: '#9ca3af' }}>
            Effective Date: 8 April 2026
          </p>

          <Section heading="1. Overview">
            This Refund Policy applies to all insurance premiums paid through the platform asp.finnomalaysia.com for the purchase of Allianz Shield Plus, distributed by WF Wealth Management (SSM No. 202101017850). Please read this policy carefully before making any payment.
          </Section>

          <Section heading="2. 24-Hour Refund Window">
            <p className="mb-3"><strong>2.1</strong> You may request a full refund of your premium within 24 hours of payment, provided that your policy has not yet been issued or activated.</p>
            <p className="mb-3"><strong>2.2</strong> To request a refund within this window, please contact us immediately via the contact details provided in Section 6 with the following information:</p>
            <ul className="mb-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Full name as per NRIC/Passport</li>
              <li>Payment reference number or transaction ID</li>
              <li>Date and time of payment</li>
              <li>Reason for refund request</li>
            </ul>
            <p><strong>2.3</strong> Refunds approved within this window will be processed back to the original payment method (FPX bank account or credit/debit card). Processing times are subject to your bank or card issuer&apos;s timeline, typically 5–14 business days.</p>
          </Section>

          <Section heading="3. Cancellation After 24 Hours">
            <p className="mb-3"><strong>3.1</strong> Refund or cancellation requests made after 24 hours of payment will be handled in accordance with Allianz&apos;s standard cancellation procedure.</p>
            <p className="mb-3"><strong>3.2</strong> If your policy has already been issued, cancellation is subject to Allianz&apos;s policy cancellation terms, which may include:</p>
            <ul className="mb-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Short-rate or pro-rata refund of unused premium (as determined by Allianz)</li>
              <li>Administrative fees or deductions as per the policy contract</li>
              <li>No refund if a claim has already been made under the policy</li>
            </ul>
            <p><strong>3.3</strong> WF Wealth Management will assist you in submitting a cancellation request to Allianz and will liaise on your behalf. However, the final decision on refund amounts rests with Allianz General Insurance Company (Malaysia) Berhad.</p>
          </Section>

          <Section heading="4. Non-Refundable Circumstances">
            The following circumstances are not eligible for a refund:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Requests made after 24 hours of payment where the policy has been issued</li>
              <li>Policies where a claim has already been submitted or paid</li>
              <li>Failure to disclose accurate health or personal information at the time of application (policy may be voided without refund at Allianz&apos;s discretion)</li>
              <li>Promotional or discounted policies where refund exclusions are stated at the time of purchase</li>
            </ul>
          </Section>

          <Section heading="5. Payment Gateway Errors">
            If you were charged but did not receive a policy confirmation due to a payment gateway or technical error, please contact us within 48 hours. We will investigate and process a full refund if the charge is confirmed and no policy was issued.
          </Section>

          <Section heading="6. How to Request a Refund">
            To initiate a refund, contact WF Wealth Management through the following:
            <div className="mt-3" style={{ color: '#3a3f4a' }}>
              <p>Website: <a href="https://asp.finnomalaysia.com" style={{ color: '#006398' }}>asp.finnomalaysia.com</a></p>
              <p>Customer service WhatsApp: <a href="https://wa.me/601154047463" style={{ color: '#006398' }}>+6011 5404 7463</a></p>
            </div>
            <p className="mt-3">Please include your transaction details and reason for the request. We will acknowledge your request within 1 business day.</p>
          </Section>

          <Section heading="7. Regulatory Reference">
            This refund policy is designed to align with the requirements of Bank Negara Malaysia (BNM) and Allianz General Insurance Company (Malaysia) Berhad&apos;s standard policy terms. Nothing in this policy limits any rights you may have under Malaysian consumer protection laws.
          </Section>

          <Section heading="8. Changes to This Policy">
            WF Wealth Management reserves the right to update this Refund Policy at any time. The current version will always be available on asp.finnomalaysia.com.
          </Section>
        </div>

        <div className="mt-8 text-center text-sm" style={{ color: '#9ca3af' }}>
          <Link href="/terms-and-conditions" style={{ color: '#006398' }} className="mx-3">Terms &amp; Conditions</Link>
          <Link href="/refund-policy" style={{ color: '#006398' }} className="mx-3">Refund Policy</Link>
          <Link href="/privacy-policy" style={{ color: '#006398' }} className="mx-3">Privacy Policy</Link>
        </div>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-bold mb-3" style={{ color: '#002356', fontFamily: 'Plus Jakarta Sans, sans-serif' }}>
        {heading}
      </h2>
      <div className="text-sm leading-relaxed" style={{ color: '#3a3f4a' }}>
        {children}
      </div>
      <hr className="mt-8" style={{ borderColor: '#f2f4f6' }} />
    </div>
  );
}
