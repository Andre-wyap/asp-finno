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

export interface PaymentFailedProps {
  applicantName: string;
  orderId: string;
  planName: string;
  premiumAmount: number;
  premiumCurrency: string;
  failureMessage?: string;
  retryUrl: string;
  trackerUrl: string;
}

export function PaymentFailed({
  applicantName,
  orderId,
  planName,
  premiumAmount,
  premiumCurrency,
  failureMessage,
  retryUrl,
  trackerUrl,
}: PaymentFailedProps) {
  const formattedAmount = new Intl.NumberFormat('en-MY', {
    style: 'currency',
    currency: premiumCurrency || 'MYR',
  }).format(premiumAmount);

  return (
    <Html lang="en">
      <Head />
      <Preview>Payment unsuccessful — retry your Allianz Shield Plus application</Preview>
      <Body style={body}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerBrand}>WF Wealth Management</Text>
            <Text style={headerTitle}>Allianz Shield Plus</Text>
          </Section>

          {/* Warning banner */}
          <Section style={warningBanner}>
            <Text style={warningText}>⚠ Payment Unsuccessful</Text>
          </Section>

          {/* Content */}
          <Section style={content}>
            <Heading style={h1}>Your payment could not be processed</Heading>
            <Text style={paragraph}>Hi {applicantName},</Text>
            <Text style={paragraph}>
              Unfortunately, your payment for <strong>{planName}</strong> was not successful. Your
              application details are still saved — you can retry your payment without having to
              re-enter your information.
            </Text>

            {failureMessage && (
              <Section style={errorBox}>
                <Text style={errorLabel}>Reason from payment provider</Text>
                <Text style={errorMessage}>{failureMessage}</Text>
              </Section>
            )}

            <Section style={summaryBox}>
              <Text style={summaryLabel}>Order reference</Text>
              <Text style={summaryValue}>{orderId}</Text>
              <Hr style={summaryDivider} />
              <Text style={summaryLabel}>Plan</Text>
              <Text style={summaryValue}>{planName}</Text>
              <Hr style={summaryDivider} />
              <Text style={summaryLabel}>Amount</Text>
              <Text style={summaryValue}>{formattedAmount}</Text>
            </Section>

            <Section style={{ textAlign: 'center', margin: '32px 0' }}>
              <Button style={primaryButton} href={retryUrl}>
                Retry Payment
              </Button>
            </Section>

            <Text style={paragraph}>
              Common reasons for payment failure include insufficient funds, bank restrictions on
              online transactions, or entering incorrect card details. If the problem persists,
              please contact your bank or reach us on WhatsApp at{' '}
              <a href="https://wa.me/601154047463" style={link}>
                +6011 5404 7463
              </a>
              .
            </Text>

            <Text style={smallText}>
              <a href={trackerUrl} style={link}>
                Check your application status
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
        No payment has been charged to your account for this transaction.
      </Text>
    </Section>
  );
}

export default PaymentFailed;

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

const warningBanner: React.CSSProperties = {
  backgroundColor: '#7c2d12',
  padding: '12px 40px',
};

const warningText: React.CSSProperties = {
  color: '#fca5a5',
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

const smallText: React.CSSProperties = {
  color: '#6b7280',
  fontSize: '13px',
  lineHeight: '1.5',
  margin: '24px 0 0 0',
};

const errorBox: React.CSSProperties = {
  backgroundColor: '#fef2f2',
  borderRadius: '8px',
  padding: '16px 20px',
  margin: '0 0 24px 0',
};

const errorLabel: React.CSSProperties = {
  color: '#b91c1c',
  fontSize: '11px',
  fontWeight: '600',
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  margin: '0 0 4px 0',
};

const errorMessage: React.CSSProperties = {
  color: '#7f1d1d',
  fontSize: '14px',
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
