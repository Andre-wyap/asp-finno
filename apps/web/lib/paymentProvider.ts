export type PaymentProvider = 'senangpay' | 'doku';

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === 'doku' ? 'doku' : 'senangpay';
}
