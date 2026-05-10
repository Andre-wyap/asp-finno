import { NextResponse } from 'next/server';
import { authError, verifyAdmin } from '../../../../lib/auth';
import { fetchActivityLogs } from '../../../../lib/activity';
import { getDb } from '../../../../lib/firebaseAdmin';

export async function GET(request: Request) {
  try {
    await verifyAdmin();
  } catch {
    return authError('Unauthenticated', 401);
  }

  const { searchParams } = new URL(request.url);
  const parsedLimit = Number(searchParams.get('limit') ?? 10);
  const limit = Number.isFinite(parsedLimit) ? Math.min(Math.max(parsedLimit, 1), 50) : 10;
  const cursor = searchParams.get('cursor');

  try {
    const page = await fetchActivityLogs(getDb(), { limit, cursor });
    return NextResponse.json(page);
  } catch (err) {
    console.error('activity_api_load_failed', err);
    return NextResponse.json({ error: 'Unable to load activity logs' }, { status: 500 });
  }
}
