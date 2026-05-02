import type { Metadata } from 'next'
import Link from 'next/link'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import EventCard from '@/components/EventCard'
import EventFilters from './EventFilters'
import type { Event } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Events | SafferBiz',
  description: 'South African events around the world — braais, markets, community meetups and more.',
}

interface Props {
  searchParams: Promise<{ country?: string; category?: string; when?: string; city?: string }>
}

export default async function EventsPage({ searchParams }: Props) {
  const { country, category, when, city } = await searchParams
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true })

  if (country) query = query.eq('country', country)
  if (category) query = query.eq('category', category)
  if (city) query = query.ilike('city', `%${city}%`)
  if (when === 'past') {
    query = query.lt('event_date', today)
  } else {
    query = query.gte('event_date', today)
  }

  const { data } = await query
  const events = (data ?? []) as Event[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">🎉 Events</h1>
          <p className="text-gray-500">SA events happening around the world</p>
        </div>
        <Link
          href="/events/submit"
          className="flex-shrink-0 px-5 py-2.5 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: '#DE3831' }}
        >
          + Submit an Event
        </Link>
      </div>

      <Suspense>
        <EventFilters />
      </Suspense>

      {events.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-xl font-semibold text-gray-700 mb-2">No events found</p>
          <p className="text-gray-400 text-sm mb-6">
            {when === 'past'
              ? 'No past events match your filters.'
              : 'No upcoming events yet — be the first to add one!'}
          </p>
          <Link
            href="/events/submit"
            className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: '#DE3831' }}
          >
            Submit an Event
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {events.length} {events.length === 1 ? 'event' : 'events'} found
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
