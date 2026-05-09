import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components';
import * as React from 'react';

export interface IssuedProps {
  applicantName: string;
  orderId: string;
  planName: string;
  policyNumber: string;
  issuedAt: string;
  trackerUrl: string;
}

export function Issued({
  applicantName,
  orderId,
  planName,
  policyNumber,
  issuedAt,
  trackerUrl,
}: IssuedProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>Your Allianz Shield Plus policy has been issued — policy no. {policyNumber}</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerBrand}>WF Wealth Management</Text>
            <Text style={headerTitle}>Allianz Shield Plus</Text>
          </Section>

          {/* Success banner */}
          <Section style={successBanner}>
            <Text style={successText}>✓ Policy Issued</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Your policy is active</Heading>
            <Text style={paragraph}>Hi {applicantName},</Text>
            <Text style={paragraph}>
              Great news! Your <strong>{planName}</strong> policy has been issued and is now
              active. Please keep your policy number safe — you&apos;ll need it for any future
              claims or inquiries.
            </Text>

            <Section style={policyHighlight}>
              <Text style={policyLabel}>Your Policy Number</Text>
              <Text style={policyNumber_}>{policyNumber}</Text>
            </Section>

            <Section style={summaryBox}>
              <Text style={summaryLabel}>Order reference</Text>
              <Text style={summaryValue}>{orderId}</Text>
              <Hr style={summaryDivider} />
              <Text style={summaryLabel}>Plan</Text>
              <Text style={summaryValue}>{planName}</Text>
              <Hr style={summaryDivider} />
              <Text style={summaryLabel}>Issue date</Text>
              <Text style={summaryValue}>{issuedAt}</Text>
            </Section>

            <Text style={paragraph}>
              Your official policy documents will be sent to you by Allianz directly. If you have
              not received them within 5 business days, please contact us.
            </Text>

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button style={primaryButton} href={trackerUrl}>
                View Application Details
              </Button>
            </Section>

            <Text style={paragraph}>
              Thank you for choosing Allianz Shield Plus, distributed by WF Wealth Management. If
              you need assistance with claims or policy matters, we&apos;re here to help. Reach us
              on WhatsApp at{' '}
              <a href="https://wa.me/601154047463" style={link}>
                +6011 5404 7463
              </a>
              .
            </Text>
          </Section>

          <Footer />
        </Container>
      </Body>
    </Html>
  );
}

function Footer() {
  return (
    <Section style={footer}>
      <Text style={footerText}>
        WF Wealth Management Sdn Bhd · SSM No. 202101017850
        <br />
        Authorised general insurance agent for Allianz General Insurance Company (Malaysia) Berhad
      </Text>
      <Text style={footerText}>
        For claims, contact Allianz at 1-800-22-5542 or visit{' '}
        <a href="https://www.allianz.com.my" style={{ color: '#9ca3af' }}>
          allianz.com.my
        </a>
        .
      </Text>
    </Section>
  );
}

export default Issued;

const body: React.CSSProperties = {
  backgroundColor: '#f7f9fb',
  fontFamily: 'Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  margin: '0',
  padding: '24px 0',
};

const container: React.CSSProperties = {
  backgroundColor: '#ffffff',
  borderRadius: '12px',
  maxWidth: '600px',
  margin: '0 auto',
  overflow: 'hidden',
};

const header: React.CSSProperties = {
  backgroundColor: '#002356',
  padding: '28px 40px',
};

const headerBrand: React.CSSProperties = {
  color: '#80a4f4',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '0 0 4px 0',
};

const headerTitle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '22px',
  fontWeight: '700',
  margin: '0',
};

const successBanner: React.CSSProperties = {
  backgroundColor: '#002935',
  padding: '12px 40px',
};

const successText: React.CSSProperties = {
  color: '#6ee7b7',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
};

const content: React.CSSProperties = {
  padding: '40px',
};

const h1: React.CSSProperties = {
  color: '#002356',
  fontSize: '24px',
  fontWeight: '700',
  margin: '0 0 24px 0',
};

const paragraph: React.CSSProperties = {
  color: '#3a3f4a',
  fontSize: '15px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const policyHighlight: React.CSSProperties = {
  backgroundColor: '#002356',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
  textAlign: 'center',
};

const policyLabel: React.CSSProperties = {
  color: '#80a4f4',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.08em',
  textTransform: 'uppercase',
  margin: '0 0 8px 0',
};

const policyNumber_: React.CSSProperties = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: '700',
  letterSpacing: '0.04em',
  margin: '0',
};

const summaryBox: React.CSSProperties = {
  backgroundColor: '#f2f4f6',
  borderRadius: '8px',
  padding: '20px 24px',
  margin: '24px 0',
};

const summaryLabel: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '12px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  margin: '0 0 4px 0',
};

const summaryValue: React.CSSProperties = {
  color: '#002356',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0',
};

const summaryDivider: React.CSSProperties = {
  borderColor: '#e0e3e8',
  borderTopWidth: '1px',
  margin: '14px 0',
};

const primaryButton: React.CSSProperties = {
  backgroundColor: '#006398',
  borderRadius: '9999px',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: '600',
  padding: '14px 32px',
  textDecoration: 'none',
  display: 'inline-block',
};

const link: React.CSSProperties = {
  color: '#006398',
  textDecoration: 'underline',
};

const footer: React.CSSProperties = {
  backgroundColor: '#f2f4f6',
  padding: '24px 40px',
};

const footerText: React.CSSProperties = {
  color: '#9ca3af',
  fontSize: '12px',
  lineHeight: '1.5',
  margin: '0 0 8px 0',
};
