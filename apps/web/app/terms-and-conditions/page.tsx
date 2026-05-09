import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Terms & Conditions — Allianz Shield Plus',
  description: 'Platform usage agreement for asp.finnomalaysia.com, operated by WF Wealth Management.',
};

export default function TermsPage() {
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
            Terms &amp; Conditions
          </h1>
          <p className="text-sm mb-8" style={{ color: '#9ca3af' }}>
            Effective Date: 8 April 2026
          </p>

          <Section heading="1. Acceptance of Terms">
            By accessing or using the platform at asp.finnomalaysia.com, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use this platform. These terms govern your use of the platform and the purchase of insurance products distributed by WF Wealth Management (SSM No. 202101017850), an authorised general insurance agent under Allianz General Insurance Company (Malaysia) Berhad.
          </Section>

          <Section heading="2. About WF Wealth Management">
            WF Wealth Management is a registered business under the laws of Malaysia (SSM No. 202101017850). We are an authorised general insurance agent and are licensed to distribute Allianz insurance products including Allianz Shield Plus. We operate the digital platform asp.finnomalaysia.com to facilitate online insurance applications and payment.
          </Section>

          <Section heading="3. Platform Services">
            Our platform provides the following services:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Online application and purchase of Allianz Shield Plus personal accident insurance</li>
              <li>Secure payment processing via FPX (online banking) and credit/debit card</li>
              <li>Policy issuance facilitation — upon successful payment, we will issue the policy within the next business day</li>
              <li>Ongoing insurance agency services, including claims assistance and policy servicing</li>
            </ul>
          </Section>

          <Section heading="4. Policy Issuance and Relationship with Allianz">
            <p className="mb-3"><strong>4.1</strong> Upon successful payment, WF Wealth Management will process and issue your Allianz Shield Plus policy within the next business day.</p>
            <p className="mb-3"><strong>4.2</strong> Once your policy is issued, you will have a direct contractual relationship with Allianz General Insurance Company (Malaysia) Berhad. Policy management, policy documents, claims settlements, and coverage obligations are governed by Allianz's terms and are the responsibility of Allianz.</p>
            <p><strong>4.3</strong> WF Wealth Management will continue to serve you as your appointed insurance agent and will assist with claims processing and general policy servicing on your behalf.</p>
          </Section>

          <Section heading="5. Payment Terms">
            <p className="mb-3"><strong>5.1</strong> All premiums are quoted in Malaysian Ringgit (MYR) and are inclusive of applicable taxes and stamp duty unless otherwise stated.</p>
            <p className="mb-3"><strong>5.2</strong> Payment must be made in full at the time of application. We accept the following payment methods:
              <ul className="mt-2 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
                <li>FPX (online banking via participating Malaysian banks)</li>
                <li>Credit card and debit card (Visa, Mastercard)</li>
              </ul>
            </p>
            <p className="mb-3"><strong>5.3</strong> Your coverage will only be activated upon successful payment and policy issuance by Allianz. We are not liable for any losses arising from delays caused by payment failure or bank processing times.</p>
            <p><strong>5.4</strong> Payment receipts and policy documents will be delivered to the email address provided at the time of application.</p>
          </Section>

          <Section heading="6. User Obligations">
            By using this platform, you agree to:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Provide accurate, complete, and truthful information in your insurance application</li>
              <li>Not misrepresent your identity or insurance needs</li>
              <li>Notify us promptly of any changes to your personal details</li>
              <li>Use the platform only for lawful purposes</li>
            </ul>
            <p className="mt-4">Providing false or misleading information may result in your policy being voided by Allianz, and WF Wealth Management shall bear no liability in such circumstances.</p>
          </Section>

          <Section heading="7. Intellectual Property">
            All content on asp.finnomalaysia.com, including text, graphics, logos, and software, is the property of WF Wealth Management or its licensors. You may not reproduce, distribute, or create derivative works from any content on this platform without our express written consent.
          </Section>

          <Section heading="8. Limitation of Liability">
            WF Wealth Management acts as an intermediary agent. Our liability is limited to the facilitation of your insurance application and policy issuance. We are not liable for:
            <ul className="mt-3 space-y-1 pl-5" style={{ listStyleType: 'disc' }}>
              <li>Any claims decisions made by Allianz</li>
              <li>Policy coverage disputes, which are subject to the policy terms issued by Allianz</li>
              <li>Losses arising from technical failures, payment gateway downtime, or third-party service disruptions</li>
              <li>Any indirect, consequential, or incidental damages arising from use of this platform</li>
            </ul>
          </Section>

          <Section heading="9. Governing Law">
            These Terms and Conditions are governed by and construed in accordance with the laws of Malaysia. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Malaysia.
          </Section>

          <Section heading="10. Changes to Terms">
            We reserve the right to modify these Terms and Conditions at any time. Changes will be effective upon posting to this platform with an updated effective date. Your continued use of the platform constitutes acceptance of the updated terms.
          </Section>

          <Section heading="11. Contact">
            <div style={{ color: '#3a3f4a' }}>
              <p className="font-semibold">WF Wealth Management</p>
              <p>Website: <a href="https://asp.finnomalaysia.com" style={{ color: '#006398' }}>asp.finnomalaysia.com</a></p>
              <p>SSM No.: 202101017850</p>
              <p>WhatsApp: <a href="https://wa.me/601154047463" style={{ color: '#006398' }}>+6011 5404 7463</a></p>
            </div>
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
