import { render } from '@react-email/render';
import { Resend } from 'resend';
import type { ReactElement } from 'react';

export interface SendEmailParams {
  to: string;
  subject: string;
  template: ReactElement;
  resendApiKey?: string;
  fromAddress?: string;
}

export interface SendEmailResult {
  messageId: string | null;
  error: string | null;
}

export async function sendEmail({
  to,
  subject,
  template,
  resendApiKey,
  fromAddress,
}: SendEmailParams): Promise<SendEmailResult> {
  const apiKey = resendApiKey ?? process.env.RESEND_API_KEY;
  const from = fromAddress ?? process.env.RESEND_FROM_ADDRESS ?? 'Allianz Shield Plus <noreply@finnomalaysia.com>';

  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  const resend = new Resend(apiKey);
  const html = await render(template);
  const text = await render(template, { plainText: true });

  const { data, error } = await resend.emails.send({
    from,
    to,
    subject,
    html,
    text,
  });

  if (error) {
    return { messageId: null, error: error.message };
  }

  return { messageId: data?.id ?? null, error: null };
}
