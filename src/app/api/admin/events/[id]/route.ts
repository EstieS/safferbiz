import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNewEventAlert } from '@/lib/sendgrid'
import { generateEventPost } from '@/lib/social-posts'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const admin = createAdminClient()

  const { error } = await admin.from('events').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If approving an event, send alerts + generate social post draft
  if (body.status === 'active') {
    try {
      // Fetch the full event
      const { data: event } = await admin
        .from('events')
        .select('title, slug, category, city, country, event_date, event_end_date, description, venue, url')
        .eq('id', id)
        .single()

      if (event) {
        // Alert matching subscribers
        const { data: subscribers } = await admin
          .from('subscribers')
          .select('name, email, unsubscribe_token, countries')
          .eq('wants_events', true)

        const matched = (subscribers ?? []).filter((sub) => {
          return !sub.countries?.length || sub.countries.includes(event.country)
        })

        if (matched.length > 0) {
          await sendNewEventAlert({ subscribers: matched, event })
        }

        // Generate social post draft for every approved event
        generateEventPost(event).catch(err =>
          console.error('Failed to generate event social post draft:', err)
        )
      }
    } catch (emailErr) {
      console.error('Failed to send event alert emails:', emailErr)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin.from('events').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
