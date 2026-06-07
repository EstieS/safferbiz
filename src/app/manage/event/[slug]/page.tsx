import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase-server'
import type { Event } from '@/lib/types'
import EventManageForm from './EventManageForm'

export const metadata = { title: 'Manage your event — SafferBiz' }

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🔒</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-sm">{body}</p>
      <Link href="/events" className="inline-block mt-6 text-sm text-green-700 hover:underline">← Back to events</Link>
    </div>
  )
}

export default async function ManageEventPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token } = await searchParams

  if (!token) {
    return <ErrorState title="Management link required" body="Please open the private link from your approval email to manage this event." />
  }

  const admin = createAdminClient()

  const { data: event } = await admin
    .from('events')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!event) {
    return <ErrorState title="Event not found" body="We couldn't find this event. It may have been removed." />
  }

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
    return (
      <ErrorState
        title="Link expired or invalid"
        body="This management link is no longer valid. Reply to your approval email and we'll send you a fresh one."
      />
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <Link href={`/events/${slug}`} className="text-sm text-gray-500 hover:text-green-700 mb-6 inline-block">
        ← View public event
      </Link>
      <h1 className="text-2xl font-bold text-gray-900">Manage {(event as Event).title}</h1>
      <p className="text-sm text-gray-500 mt-1">
        Update your event details below — changes go live immediately. Double-check the <strong>start date</strong>.
      </p>
      <EventManageForm event={event as Event} token={token} />
    </div>
  )
}
