import { NextResponse } from 'next/server';
import { authError, verifyAdmin } from '../../../../../lib/auth';
import { getDb } from '../../../../../lib/firebaseAdmin';
import { buildRecipientQuery, type MarketingFilters } from '../../../../../lib/marketing';

export async function POST(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  let filters: MarketingFilters;
  try {
    filters = (await request.json()) as MarketingFilters;
  } catch {
    return NextResponse.json({ error: 'Invalid filter payload' }, { status: 400 });
  }

  const db = getDb();
  const docs = await buildRecipientQuery(db, filters);

  const recipients = docs
    .map((d) => {
      const data = d.data();
      return {
        orderId: d.id,
        name: (data.applicant?.name ?? '') as string,
        email: (data.applicant?.email ?? '') as string,
        status: (data.status ?? '') as string,
        planCode: (data.plan?.code ?? '') as string,
        marketingUnsubscribed: Boolean(data.marketingUnsubscribed)
      };
    })
    .filter((r) => r.email && !r.marketingUnsubscribed);

  return NextResponse.json({
    total: recipients.length,
    sample: recipients.slice(0, 50)
  });
}
