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

export interface LeadReminderProps {
  applicantName: string;
  orderId: string;
  planName: string;
  premiumAmount: number;
  premiumCurrency: string;
  paymentUrl: string;
  trackerUrl: string;
}

export function LeadReminder({
  applicantName,
  orderId,
  planName,
  premiumAmount,
  premiumCurrency,
  paymentUrl,
  trackerUrl,
}: LeadReminderProps) {
  const formattedAmount = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: premiumCurrency || 'MYR',
  }).format(premiumAmount);

  return (
    <Html lang="en">
      <Head />
      <Preview>Complete your Allianz Shield Plus payment — your application is waiting</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerBrand}>WF Wealth Management</Text>
            <Text style={headerTitle}>Allianz Shield Plus</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Your application is waiting</Heading>
            <Text style={paragraph}>Hi {applicantName},</Text>
            <Text style={paragraph}>
              You started an application for <strong>{planName}</strong> but haven&apos;t completed
              your payment yet. Your application details have been saved — just pick up where you
              left off.
            </Text>

            <Section style={summaryBox}>
              <Text style={summaryLabel}>Application reference</Text>
              <Text style={summaryValue}>{orderId}</Text>
              <Hr style={summaryDivider} />
              <Text style={summaryLabel}>Plan selected</Text>
              <Text style={summaryValue}>{planName}</Text>
              <Hr style={summaryDivider} />
              <Text style={summaryLabel}>Annual premium</Text>
              <Text style={summaryValue}>{formattedAmount}</Text>
            </Section>

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button style={primaryButton} href={paymentUrl}>
                Complete Payment Now
              </Button>
            </Section>

            <Text style={paragraph}>
              Your coverage begins only after successful payment and policy issuance. If you have
              any questions, reach us on WhatsApp at{' '}
              <a href="https://wa.me/601154047463" style={link}>
                +6011 5404 7463
              </a>
              .
            </Text>

            <Text style={smallText}>
              Already paid?{' '}
              <a href={trackerUrl} style={link}>
                Track your application status here.
              </a>
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
        This email was sent because you started an insurance application on asp.finnomalaysia.com.
      </Text>
    </Section>
  );
}

export default LeadReminder;

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

const smallText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '24px 0 0 0',
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
