import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { slugify } from '@/lib/slugify'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { title, description, category, country, city, venue, event_date, event_end_date, event_time, url, organizer_name, organizer_email, organizer_phone } = body

    if (!title || !category || !country || !event_date || !organizer_name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const baseSlug = slugify(title)

    // Ensure unique slug
    let slug = baseSlug
    let suffix = 1
    while (true) {
      const { data } = await supabase.from('events').select('id').eq('slug', slug).single()
      if (!data) break
      slug = `${baseSlug}-${suffix++}`
    }

    const { error } = await supabase.from('events').insert({
      title: title.trim(),
      slug,
      description: description?.trim() || null,
      category,
      country,
      city: city?.trim() || null,
      venue: venue?.trim() || null,
      event_date,
      event_end_date: event_end_date || null,
      event_time: event_time?.trim() || null,
      url: url?.trim() || null,
      organizer_name: organizer_name.trim(),
      organizer_email: organizer_email?.trim() || null,
      organizer_phone: organizer_phone?.trim() || null,
      status: 'pending',
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Event submit error:', err)
    return NextResponse.json({ error: 'Failed to submit event' }, { status: 500 })
  }
}
