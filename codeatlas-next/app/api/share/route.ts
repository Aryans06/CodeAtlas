import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Get Supabase service role client to bypass RLS for public table
const getSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('Supabase coordinates missing in .env.local');
  }
  return createClient(url, key);
};

export async function POST(req: NextRequest) {
  try {
    const { messages, title, repoName } = await req.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: 'No messages to share.' }, { status: 400 });
    }

    const defaultTitle = title || 'Shared CodeAtlas Snippet';
    const defaultRepo = repoName || 'Local Project';

    const supabase = getSupabase();

    const { data, error } = await supabase
      .from('shared_snippets')
      .insert([
        {
          title: defaultTitle,
          repo_name: defaultRepo,
          messages,
        }
      ])
      .select('id')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, id: data.id });
  } catch (err: any) {
    console.error('❌ Failed to share snippet:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
