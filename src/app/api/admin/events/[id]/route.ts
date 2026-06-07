import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNewEventAlert, sendEventApprovedEmail } from '@/lib/sendgrid'
import { generateEventPost } from '@/lib/social-posts'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://safferbiz.com'

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
        .select('title, slug, category, city, country, event_date, event_end_date, description, venue, url, organizer_email')
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

        // Email the organiser to confirm their event is live, with a private
        // link to manage their own event details (date, venue, etc.)
        if (event.organizer_email) {
          let manageUrl: string | undefined
          try {
            const manageToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
            // Valid until ~2 weeks after the event, or 30 days out — whichever is later
            const eventTime = event.event_date ? new Date(event.event_date).getTime() : Date.now()
            const expires = new Date(
              Math.max(Date.now() + 30 * 86400000, eventTime + 14 * 86400000)
            ).toISOString()
            const { error: tokenErr } = await admin
              .from('event_manage_tokens')
              .upsert({ event_id: id, token: manageToken, expires_at: expires }, { onConflict: 'event_id' })
            if (!tokenErr) manageUrl = `${SITE}/manage/event/${event.slug}?token=${manageToken}`
          } catch (tokenErr) {
            console.error('Failed to mint event manage token:', tokenErr)
          }

          sendEventApprovedEmail({
            title: event.title,
            slug: event.slug,
            email: event.organizer_email,
            manageUrl,
          }).catch(err => console.error('Failed to send event approval email:', err))
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
