import { NextResponse } from 'next/server';
import { authError, verifyAdmin } from '../../../../lib/auth';
import { getDb } from '../../../../lib/firebaseAdmin';

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? '';
  const search = searchParams.get('search')?.toLowerCase().trim() ?? '';
  const searchField = searchParams.get('searchField') ?? 'name'; // 'name' | 'email' | 'orderId'
  const cursor = searchParams.get('cursor') ?? '';

  const db = getDb();

  // Direct orderId lookup
  if (searchField === 'orderId' && search) {
    const doc = await db.collection('applications').doc(search.toUpperCase()).get();
    if (!doc.exists) return NextResponse.json({ applications: [], nextCursor: null });
    return NextResponse.json({ applications: [{ id: doc.id, ...doc.data() }], nextCursor: null });
  }

  let query: FirebaseFirestore.Query = db.collection('applications');

  // Status filter (exact match, server-side)
  if (status) {
    query = query.where('status', '==', status);
  }

  // Prefix search on searchKeys.nameLower or searchKeys.emailLower
  if (search && (searchField === 'name' || searchField === 'email')) {
    const field = searchField === 'name' ? 'searchKeys.nameLower' : 'searchKeys.emailLower';
    query = query
      .where(field, '>=', search)
      .where(field, '<', search + '')
      .orderBy(field);
  } else {
    query = query.orderBy('createdAt', 'desc');
  }

  // Pagination via startAfter cursor (the last orderId from the previous page)
  if (cursor) {
    const cursorDoc = await db.collection('applications').doc(cursor).get();
    if (cursorDoc.exists) {
      query = query.startAfter(cursorDoc);
    }
  }

  query = query.limit(PAGE_SIZE + 1);

  const snapshot = await query.get();
  const docs = snapshot.docs;
  const hasMore = docs.length > PAGE_SIZE;
  const page = hasMore ? docs.slice(0, PAGE_SIZE) : docs;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  const applications = page.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ applications, nextCursor });
}
