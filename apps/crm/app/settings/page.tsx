import { redirect } from 'next/navigation';
import { CrmShell } from '../../components/CrmShell';
import { PaymentProviderControl } from '../../components/PaymentProviderControl';
import { verifyAdmin } from '../../lib/auth';
import { getDb } from '../../lib/firebaseAdmin';

type PaymentProvider = 'senangpay' | 'doku';

function fallbackProvider(): PaymentProvider {
  return process.env.PAYMENT_PROVIDER === 'senangpay' ? 'senangpay' : 'doku';
}

function isPaymentProvider(value: unknown): value is PaymentProvider {
  return value === 'doku' || value === 'senangpay';
}

export default async function SettingsPage() {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  const db = getDb();
  const paymentSettings = await db.collection('settings').doc('payment').get();
  const configuredProvider = paymentSettings.data()?.activeProvider;
  const activeProvider = isPaymentProvider(configuredProvider)
    ? configuredProvider
    : fallbackProvider();
  const configured = isPaymentProvider(configuredProvider);

  return (
    <CrmShell>
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">
            Operations
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-primary">Settings</h1>
        </div>

        <div className="mt-6">
          <PaymentProviderControl
            initialProvider={activeProvider}
            initialConfigured={configured}
          />
        </div>
      </div>
    </CrmShell>
  );
}
