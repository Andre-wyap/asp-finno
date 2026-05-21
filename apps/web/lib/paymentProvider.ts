export type PaymentProvider = 'senangpay' | 'doku';

export function getPaymentProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === 'doku' ? 'doku' : 'senangpay';
}

function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === 'doku' || value === 'senangpay';
}

export async function getRuntimePaymentProvider(
  db: FirebaseFirestore.Firestore
): Promise<PaymentProvider> {
  try {
    const settings = await db.collection('settings').doc('payment').get();
    const provider = settings.data()?.activeProvider;

    if (isPaymentProvider(provider)) {
      return provider;
    }
  } catch (error) {
    console.error('payment_provider_config_read_failed', {
      error: error instanceof Error ? error.message : String(error)
    });
  }

  return getPaymentProvider();
}
