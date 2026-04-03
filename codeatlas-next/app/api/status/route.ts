import { NextResponse } from 'next/server';
import { indexingState } from '@/lib/state';

export async function GET() {
  return NextResponse.json(indexingState);
}
