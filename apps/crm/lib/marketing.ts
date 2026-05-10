import type { Firestore } from 'firebase-admin/firestore';

export type MarketingFilters = {
  statuses?: string[];
  planCodes?: string[];
  occupationCategories?: string[];
  paid?: 'all' | 'paid' | 'unpaid';
  dateFrom?: string;
  dateTo?: string;
};

const VALID_STATUSES = ['applied', 'lead', 'paid', 'payment_failed', 'issued', 'drop'];
const VALID_CATEGORIES = ['A', 'B'];

export async function buildRecipientQuery(db: Firestore, filters: MarketingFilters) {
  let q: FirebaseFirestore.Query = db.collection('applications');

  const statuses = (filters.statuses ?? []).filter((s) => VALID_STATUSES.includes(s));

  if (filters.paid === 'paid') {
    q = q.where('status', 'in', ['paid', 'issued']);
  } else if (filters.paid === 'unpaid') {
    q = q.where('status', 'in', ['applied', 'lead', 'payment_failed']);
  } else if (statuses.length > 0 && statuses.length <= 10) {
    q = q.where('status', 'in', statuses);
  }

  if (filters.dateFrom) {
    const from = new Date(filters.dateFrom);
    if (!Number.isNaN(from.getTime())) q = q.where('createdAt', '>=', from);
  }
  if (filters.dateTo) {
    const to = new Date(filters.dateTo);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      q = q.where('createdAt', '<=', to);
    }
  }

  q = q.orderBy('createdAt', 'desc').limit(2000);

  const snap = await q.get();

  const planCodes = filters.planCodes ?? [];
  const categories = (filters.occupationCategories ?? []).filter((c) =>
    VALID_CATEGORIES.includes(c)
  );

  return snap.docs.filter((d) => {
    const data = d.data();
    if (planCodes.length > 0 && !planCodes.includes(data.plan?.code)) return false;
    if (categories.length > 0 && !categories.includes(data.plan?.occupationCategory)) return false;
    if (statuses.length > 0 && filters.paid === 'all' && !statuses.includes(data.status))
      return false;
    return true;
  });
}
