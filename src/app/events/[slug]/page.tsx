import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Event, Listing } from '@/lib/types'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('events')
    .select('title, description, event_date, city, country, category')
    .eq('slug', slug)
    .single()
  if (!data) return { title: 'Event not found' }

  const date = new Date(data.event_date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const location = [data.city, data.country].filter(Boolean).join(', ')
  const description = data.description
    ?? `${data.category} event on ${date}${location ? ` in ${location}` : ''}. Listed on SafferBiz.`
  const url = `https://safferbiz.com/events/${slug}`

  return {
    title: data.title,
    description,
    openGraph: {
      title: data.title,
      description,
      url,
      type: 'article',
      siteName: 'SafferBiz',
    },
    twitter: {
      card: 'summary',
      title: data.title,
      description,
    },
  }
}

export default async function EventPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: eventData } = await supabase
    .from('events')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!eventData) notFound()
  const event = eventData as Event

  // Fetch linked listing if any
  let linkedListing: Listing | null = null
  if (event.listing_id) {
    const { data } = await supabase.from('listings').select('*').eq('id', event.listing_id).single()
    linkedListing = data as Listing | null
  }

  const eventDate = new Date(event.event_date + 'T00:00:00')
  const endDate = event.event_end_date ? new Date(event.event_end_date + 'T00:00:00') : null
  const isPast = eventDate < new Date(new Date().setHours(0, 0, 0, 0))

  const dateStr = endDate
    ? `${eventDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} – ${endDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : eventDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Link href="/events" className="text-sm text-gray-500 hover:text-green-700 flex items-center gap-1 mb-6">
        ← Back to Events
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="h-2" style={{ backgroundColor: '#DE3831' }} />
        <div className="p-8">
          {isPast && (
            <span className="inline-block mb-3 text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500">Past Event</span>
          )}

          <div className="flex items-start gap-4 mb-6">
            <div className="text-center bg-red-50 border border-red-100 rounded-xl px-4 py-2 flex-shrink-0">
              <p className="text-sm font-bold text-red-600 uppercase">
                {eventDate.toLocaleDateString('en-GB', { month: 'short' })}
              </p>
              <p className="text-4xl font-bold text-red-700 leading-none">{eventDate.getDate()}</p>
              <p className="text-xs text-red-500">{eventDate.getFullYear()}</p>
            </div>
            <div>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
                {event.category}
              </span>
              <h1 className="text-2xl font-bold text-gray-900 mt-2">{event.title}</h1>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6 p-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Date</p>
              <p className="text-sm font-medium text-gray-800">{dateStr}</p>
            </div>
            {event.event_time && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Time</p>
                <p className="text-sm font-medium text-gray-800">🕐 {event.event_time}</p>
              </div>
            )}
            {(event.venue || event.city) && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Location</p>
                <p className="text-sm font-medium text-gray-800">
                  📍 {[event.venue, event.city, event.country].filter(Boolean).join(', ')}
                </p>
              </div>
            )}
            {event.organizer_name && (
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Organiser</p>
                <p className="text-sm font-medium text-gray-800">{event.organizer_name}</p>
              </div>
            )}
          </div>

          {event.description && (
            <div className="mb-6">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">About this event</h2>
              <p className="text-gray-700 whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 mb-6">
            {event.url && (
              <a href={event.url} target="_blank" rel="noopener noreferrer"
                className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
                style={{ backgroundColor: '#DE3831' }}>
                View Event / Get Tickets →
              </a>
            )}
            {event.facebook_url && (
              <a href={event.facebook_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-blue-600 hover:bg-blue-50 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                Facebook
              </a>
            )}
            {event.instagram_url && (
              <a href={event.instagram_url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-pink-600 hover:bg-pink-50 transition-colors">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                </svg>
                Instagram
              </a>
            )}
          </div>

          {linkedListing && (
            <div className="border-t border-gray-100 pt-6">
              <p className="text-xs text-gray-400 uppercase tracking-wider mb-3">Organised by</p>
              <Link
                href={`/listings/${linkedListing.slug}`}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-green-400 transition-colors"
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: '#007A4D' }}
                >
                  {linkedListing.business_name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{linkedListing.business_name}</p>
                  <p className="text-xs text-gray-500">{linkedListing.category}</p>
                </div>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
