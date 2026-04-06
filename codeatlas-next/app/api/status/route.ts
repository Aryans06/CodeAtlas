import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { vectorStore } from '@/lib/vectorStore';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ isIndexed: false, totalChunks: 0 });

    const status = await vectorStore.getStatus(userId);
    return NextResponse.json(status);
  } catch (err: any) {
    console.error('❌ Status check failed:', err);
    return NextResponse.json({ error: err.message, isIndexed: false }, { status: 500 });
  }
}
