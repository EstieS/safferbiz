import Link from 'next/link'
import type { Event } from '@/lib/types'

interface Props {
  event: Event
}

function formatDate(dateStr: string, endDateStr?: string | null): string {
  const date = new Date(dateStr + 'T00:00:00')
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }
  const start = date.toLocaleDateString('en-GB', opts)
  if (!endDateStr) return start
  const end = new Date(endDateStr + 'T00:00:00').toLocaleDateString('en-GB', opts)
  return `${start} – ${end}`
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

  return (
    <Link href={`/events/${event.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-green-400 transition-all h-full flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: '#DE3831' }} />

        <div className="p-4 flex flex-col h-full">
          {/* Date badge */}
          <div className="flex items-start justify-between gap-2 mb-3">
            <div className="text-center bg-red-50 border border-red-100 rounded-lg px-3 py-1.5 flex-shrink-0">
              <p className="text-xs font-bold text-red-600 uppercase">
                {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
              </p>
              <p className="text-2xl font-bold text-red-700 leading-none">
                {new Date(event.event_date + 'T00:00:00').getDate()}
              </p>
            </div>
            <div className="flex-1 min-w-0">
              {isToday && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">Today!</span>}
              {isSoon && !isToday && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">{daysUntil} days away</span>}
              {isPast && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Past event</span>}
              <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors line-clamp-2 mt-1 text-sm">
                {event.title}
              </h3>
            </div>
          </div>

          {event.description && (
            <p className="text-xs text-gray-500 line-clamp-2 flex-1 mb-3">{event.description}</p>
          )}

          <div className="space-y-1 mt-auto">
            {(event.venue || event.city) && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span>📍</span>
                <span className="truncate">{[event.venue, event.city, event.country].filter(Boolean).join(', ')}</span>
              </p>
            )}
            {event.event_time && (
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <span>🕐</span> {event.event_time}
              </p>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100">
              {event.category}
            </span>
            <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors">
              Details →
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}
