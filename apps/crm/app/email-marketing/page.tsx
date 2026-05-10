import { redirect } from 'next/navigation';
import { CrmShell } from '../../components/CrmShell';
import { EmailMarketingPanel } from '../../components/EmailMarketingPanel';
import { verifyAdmin } from '../../lib/auth';
import { plans } from '@asp/pricing';

export default async function EmailMarketingPage() {
  try {
    await verifyAdmin();
  } catch {
    redirect('/login');
  }

  const planOptions = plans.map((p) => ({ code: p.code, name: p.name }));

  return (
    <CrmShell>
      <div className="mx-auto max-w-4xl">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-secondary">Outreach</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-primary">Email Marketing</h1>
          <p className="mt-2 max-w-2xl text-sm text-on-surface-variant">
            Send broadcast emails to applicants by segment. Recipients with{' '}
            <code className="rounded bg-surface-container-low px-1 py-0.5 text-xs">
              marketingUnsubscribed: true
            </code>{' '}
            are filtered out automatically. Use this only for marketing — transactional emails are
            triggered by status changes.
          </p>
        </div>

        <EmailMarketingPanel planOptions={planOptions} />
      </div>
    </CrmShell>
  );
}
