import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const { name, email, countries, categories, wants_events } = await req.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Check if subscriber already exists (to preserve their token)
    const { data: existing } = await supabase
      .from('subscribers')
      .select('unsubscribe_token')
      .eq('email', email.trim().toLowerCase())
      .maybeSingle()

    const { error } = await supabase.from('subscribers').upsert({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      countries: Array.isArray(countries) ? countries : [],
      categories: Array.isArray(categories) ? categories : [],
      wants_events: wants_events === true,
      // Preserve existing token if re-subscribing, otherwise generate a new one
      unsubscribe_token: existing?.unsubscribe_token ?? randomUUID(),
    }, { onConflict: 'email' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
  }
}
