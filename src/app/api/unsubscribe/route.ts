import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

export async function POST(req: NextRequest) {
  try {
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Invalid token' }, { status: 400 })

    const supabase = createAdminClient()
    const { error } = await supabase.from('subscribers').delete().eq('unsubscribe_token', token)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Unsubscribe error:', err)
    return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
  }
}
