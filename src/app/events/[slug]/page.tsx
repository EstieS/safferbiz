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
  const { data } = await supabase.from('events').select('title, description').eq('slug', slug).single()
  if (!data) return { title: 'Event not found' }
  return {
    title: `${data.title} | SafferBiz Events`,
    description: data.description ?? undefined,
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

          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm mb-6"
              style={{ backgroundColor: '#DE3831' }}
            >
              View Event / Get Tickets →
            </a>
          )}

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
