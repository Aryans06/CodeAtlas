import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { vectorStore } from '@/lib/vectorStore';

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { repoName } = await req.json();
    if (!repoName) {
      return NextResponse.json({ error: 'repoName is required' }, { status: 400 });
    }

    console.log(`🗑️ Deleting workspace: ${repoName} for user ${userId}`);
    await vectorStore.clear(userId, repoName);

    return NextResponse.json({ success: true, deleted: repoName });
  } catch (err: any) {
    console.error('❌ Workspace deletion failed:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
