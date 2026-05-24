import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase-server'

// Returns upcoming active events for the given countries
// Usage: /api/events/nearby?countries=United+States&countries=Canada
export async function GET(req: NextRequest) {
  const countries = req.nextUrl.searchParams.getAll('countries')
  if (!countries.length) return NextResponse.json([])

  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().slice(0, 10)

  const { data, error } = await supabase
    .from('events')
    .select('id, title, slug, event_date, event_time, venue, city, country, category, description, url')
    .eq('status', 'active')
    .gte('event_date', today)
    .in('country', countries)
    .order('event_date', { ascending: true })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [])
}
