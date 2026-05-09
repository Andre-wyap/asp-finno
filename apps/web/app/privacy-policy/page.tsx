import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — Allianz Shield Plus',
  description: 'How WF Wealth Management collects, uses, and protects your personal data under Malaysia\'s PDPA.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f7f9fb' }}>
      <div className="max-w-3xl mx-auto px-6 py-16">
        {/* Back link */}
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
            Privacy Policy
          </h1>
          <p className="text-sm mb-8" style={{ color: '#9ca3af' }}>
            Effective Date: 8 April 2026
          </p>

          <Section heading="1. Introduction">
            WF Wealth Management (SSM No. 202101017850) ("we", "us", or "our"), operating the platform at asp.finnomalaysia.com, is committed to protecting your personal data in accordance with Malaysia's Personal Data Protection Act 2010 (PDPA). This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform.
          </Section>

          <Section heading="2. Data We Collect">
            <strong>2.1 Information You Provide</strong>
            <ul className="mt-2 mb-4 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Full name, identity card (NRIC) or passport number</li>
              <li>Date of birth, gender, nationality</li>
              <li>Contact details: email address, phone number, residential address</li>
              <li>Payment information: bank account details, card details (processed via secure payment gateway)</li>
              <li>Nomination details including full name, NRIC, relationship with insured</li>
              <li>Insurance-related information required for policy underwriting</li>
            </ul>
            <strong>2.2 Information Collected Automatically</strong>
            <ul className="mt-2 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>IP address, browser type, operating system</li>
              <li>Pages visited, time spent, clickstream data</li>
              <li>Cookies and similar tracking technologies (see Section 7)</li>
            </ul>
          </Section>

          <Section heading="3. Purpose of Data Collection">
            We collect and process your personal data for the following purposes:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>To process your insurance application and facilitate policy issuance with Allianz Malaysia</li>
              <li>To verify your identity and prevent fraud</li>
              <li>To communicate policy details, renewal reminders, and important notices</li>
              <li>To send marketing communications about insurance products (with your consent)</li>
              <li>To process payments via FPX or credit/debit card</li>
              <li>To improve our platform, services, and user experience through analytics</li>
              <li>To comply with legal and regulatory obligations under BNM and relevant Malaysian laws</li>
            </ul>
          </Section>

          <Section heading="4. Sharing of Personal Data">
            Your personal data may be shared with the following parties:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Allianz General Insurance Company (Malaysia) Berhad — for policy issuance and ongoing policy management</li>
              <li>Payment gateway providers — for secure processing of FPX and card transactions</li>
              <li>Regulatory bodies — Bank Negara Malaysia (BNM) or other authorities when legally required</li>
            </ul>
            <p className="mt-4">We do not sell your personal data to third parties.</p>
          </Section>

          <Section heading="5. Data Retention">
            We retain your personal data for as long as necessary to fulfil the purposes outlined in this policy, or as required by law. Once a policy is issued and the customer relationship is transferred to Allianz, your policy data is held and managed by Allianz in accordance with their own data retention policy. We retain agent-client relationship data for a minimum of 7 years in compliance with Malaysian financial services regulations.
          </Section>

          <Section heading="6. Your Rights Under PDPA">
            You have the right to:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Access the personal data we hold about you</li>
              <li>Correct any inaccurate or incomplete data</li>
              <li>Withdraw consent for marketing communications at any time</li>
              <li>Inquire about how your data is being used</li>
            </ul>
            <p className="mt-4">To exercise your rights, please contact us at the details provided in Section 9.</p>
          </Section>

          <Section heading="7. Cookies Policy">
            Our platform uses cookies and similar technologies to:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Maintain session state and remember your preferences</li>
              <li>Analyse traffic patterns and platform usage via analytics tools</li>
              <li>Support marketing and remarketing campaigns</li>
            </ul>
            <p className="mt-4">You may disable cookies through your browser settings. However, some features of the platform may not function correctly without cookies.</p>
          </Section>

          <Section heading="8. Security">
            We implement appropriate technical and organisational measures to protect your personal data against unauthorised access, disclosure, alteration, or destruction. Payment transactions are encrypted using SSL/TLS. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
          </Section>

          <Section heading="9. Contact Us">
            <p>For any privacy-related inquiries, please contact:</p>
            <div className="mt-3" style={{ color: '#3a3f4a' }}>
              <p className="font-semibold">WF Wealth Management</p>
              <p>Website: <a href="https://asp.finnomalaysia.com" style={{ color: '#006398' }}>asp.finnomalaysia.com</a></p>
              <p>SSM No.: 202101017850</p>
              <p>WhatsApp: <a href="https://wa.me/601154047463" style={{ color: '#006398' }}>+6011 5404 7463</a></p>
            </div>
          </Section>

          <Section heading="10. Changes to This Policy">
            We reserve the right to update this Privacy Policy at any time. Changes will be posted on this page with an updated effective date. Your continued use of the platform after any changes constitutes your acceptance of the revised policy.
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
