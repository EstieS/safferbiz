'use client'

import Link from 'next/link'
import type { Event } from '@/lib/types'
import { getRegionColor, getCountryFlag } from '@/lib/regions'
import AddToCalendar from './AddToCalendar'

interface Props {
  event: Event
}

function getDaysUntil(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const event = new Date(dateStr + 'T00:00:00')
  return Math.ceil((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function EventCard({ event }: Props) {
  const daysUntil = getDaysUntil(event.event_date)
  const isPast = daysUntil < 0
  const isToday = daysUntil === 0
  const isSoon = daysUntil > 0 && daysUntil <= 7

  const flag = getCountryFlag(event.country)
  const regionColor = getRegionColor(event.country)
  const cityCountry = [event.city, event.country].filter(Boolean).join(', ')

  return (
    <Link href={`/events/${event.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-green-400 transition-all h-full flex flex-col relative overflow-hidden">

        {/* Regional colour stripe */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" style={{ backgroundColor: regionColor }} />

        <div className="p-4 flex flex-col h-full">

          {/* Date + title + location */}
          <div className="flex items-start gap-3 mb-3">
            {/* Date badge — stays red, it's the event identity */}
            <div className="text-center bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 flex-shrink-0 min-w-[52px]">
              <p className="text-xs font-bold text-red-600 uppercase leading-tight">
                {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
              </p>
              <p className="text-2xl font-bold text-red-700 leading-none">
                {new Date(event.event_date + 'T00:00:00').getDate()}
              </p>
            </div>

            {/* Title + location */}
            <div className="flex-1 min-w-0">
              {isToday && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Today!</span>}
              {isSoon && !isToday && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{daysUntil} days away</span>}
              {isPast && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Past event</span>}

              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2 mt-1 text-sm leading-snug">
                {event.title}
              </h3>

              {/* City + Country — flag emoji + prominent text */}
              {cityCountry && (
                <p className="mt-1 text-sm font-semibold text-gray-700 truncate flex items-center gap-1.5">
                  {flag
                    ? <img src={flag} alt={event.country} width={20} height={15} className="inline-block flex-shrink-0" />
                    : <span>🌍</span>
                  }
                  {cityCountry}
                </p>
              )}
            </div>
          </div>

          {/* Description */}
          {event.description && (
            <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">{event.description}</p>
          )}

          {/* Venue + time */}
          <div className="space-y-0.5 mt-auto mb-3">
            {event.venue && (
              <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
                <span>🏛</span>
                <span className="truncate">{event.venue}</span>
              </p>
            )}
            {event.event_time && (
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <span>🕐</span> {event.event_time}
              </p>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${regionColor}18`, color: regionColor }}>
              {event.category}
            </span>
            <div className="flex items-center gap-2">
              {event.facebook_url && (
                <a href={event.facebook_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-gray-300 hover:text-blue-600 transition-colors" aria-label="Facebook">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                </a>
              )}
              {event.instagram_url && (
                <a href={event.instagram_url} target="_blank" rel="noopener noreferrer"
                  onClick={e => e.stopPropagation()}
                  className="text-gray-300 hover:text-pink-500 transition-colors" aria-label="Instagram">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
                  </svg>
                </a>
              )}
              {!isPast && <AddToCalendar event={event} variant="compact" />}
              <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors">
                Details →
              </span>
            </div>
          </div>

        </div>
      </div>
    </Link>
  )
}
