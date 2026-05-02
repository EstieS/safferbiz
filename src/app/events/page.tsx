import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import EventCard from '@/components/EventCard'
import { EVENT_CATEGORIES, COUNTRIES } from '@/lib/constants'
import type { Event } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Events | SafferBiz',
  description: 'South African events around the world — braais, markets, community meetups and more.',
}

interface Props {
  searchParams: Promise<{ country?: string; category?: string; when?: string }>
}

export default async function EventsPage({ searchParams }: Props) {
  const { country, category, when } = await searchParams
  const supabase = await createServerSupabaseClient()
  const today = new Date().toISOString().split('T')[0]

  let query = supabase
    .from('events')
    .select('*')
    .eq('status', 'active')
    .order('event_date', { ascending: true })

  if (country) query = query.eq('country', country)
  if (category) query = query.eq('category', category)
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

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-8">
        {/* When */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
          <Link
            href={{ pathname: '/events', query: { ...(country && { country }), ...(category && { category }) } }}
            className={`px-4 py-2 font-medium transition-colors ${!when || when === 'upcoming' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Upcoming
          </Link>
          <Link
            href={{ pathname: '/events', query: { ...(country && { country }), ...(category && { category }), when: 'past' } }}
            className={`px-4 py-2 font-medium transition-colors ${when === 'past' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
          >
            Past
          </Link>
        </div>

        {/* Category */}
        <select
          defaultValue={category ?? ''}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white"
          onChange={(e) => {
            const params = new URLSearchParams()
            if (e.target.value) params.set('category', e.target.value)
            if (country) params.set('country', country)
            if (when) params.set('when', when)
            window.location.href = `/events?${params.toString()}`
          }}
        >
          <option value="">All categories</option>
          {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {/* Country */}
        <select
          defaultValue={country ?? ''}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white"
          onChange={(e) => {
            const params = new URLSearchParams()
            if (e.target.value) params.set('country', e.target.value)
            if (category) params.set('category', category)
            if (when) params.set('when', when)
            window.location.href = `/events?${params.toString()}`
          }}
        >
          <option value="">All countries</option>
          {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        {(country || category || when) && (
          <Link href="/events" className="px-3 py-2 text-sm text-gray-500 hover:text-red-600">
            Clear filters ✕
          </Link>
        )}
      </div>

      <p className="text-sm text-gray-500 mb-6">
        {events.length} {events.length === 1 ? 'event' : 'events'} found
      </p>

      {events.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">📅</p>
          <p className="text-gray-400 text-lg mb-2">No events found</p>
          <p className="text-gray-400 text-sm mb-6">Know of an SA event? Add it!</p>
          <Link
            href="/events/submit"
            className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
            style={{ backgroundColor: '#DE3831' }}
          >
            Submit an Event
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {events.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  )
}
