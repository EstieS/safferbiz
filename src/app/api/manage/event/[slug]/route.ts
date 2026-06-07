import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Fields an organiser is allowed to edit. Excludes status, slug, organizer_*,
// listing_id, timestamps, etc.
const EDITABLE = [
  'title', 'description', 'event_date', 'event_end_date', 'event_time',
  'venue', 'city', 'country', 'url', 'facebook_url', 'instagram_url',
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { token } = body

    if (!token) return NextResponse.json({ error: 'Missing management token' }, { status: 401 })

    const admin = createAdminClient()

    const { data: event } = await admin
      .from('events')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!event) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const { data: tokenRow } = await admin
      .from('event_manage_tokens')
      .select('token, expires_at')
      .eq('event_id', event.id)
      .single()

    const valid =
      tokenRow &&
      tokenRow.token === token &&
      new Date(tokenRow.expires_at).getTime() > Date.now()

    if (!valid) {
      return NextResponse.json({ error: 'Your management link has expired or is invalid.' }, { status: 403 })
    }

    const update: Record<string, unknown> = {}
    for (const key of EDITABLE) {
      if (key in body) {
        const v = typeof body[key] === 'string' ? body[key].trim() : body[key]
        update[key] = v === '' ? null : v
      }
    }
    if (!update.title) {
      return NextResponse.json({ error: 'Event title is required' }, { status: 400 })
    }
    if (!update.event_date) {
      return NextResponse.json({ error: 'Start date is required' }, { status: 400 })
    }

    const { error } = await admin.from('events').update(update).eq('id', event.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Event manage update error:', err)
    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}
