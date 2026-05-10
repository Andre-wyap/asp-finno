import { redirect } from 'next/navigation';
import { CrmShell } from '../../components/CrmShell';
import { PromoCodesPanel } from '../../components/PromoCodesPanel';
import { verifyAdmin } from '../../lib/auth';
import { plans } from '@asp/pricing';

export default async function PromoCodesPage() {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  const planOptions = plans.map((p) => ({ code: p.code, name: p.name }));

  return (
    <CrmShell>
      <div className="mx-auto max-w-5xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Discounts</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-primary">Promo Codes</h1>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Create discount codes that customers can apply at checkout. Codes are validated
            server-side; usage counts increment on successful payment.
          </p>
        </div>

        <PromoCodesPanel planOptions={planOptions} />
      </div>
    </CrmShell>
  );
}
