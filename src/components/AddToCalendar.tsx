'use client'

import { useState } from 'react'
import type { CalEvent } from '@/lib/calendar'
import { googleCalendarUrl, icsContent } from '@/lib/calendar'

/**
 * "Add to calendar" control.
 * - variant="compact": one tap → downloads .ics (opens the native calendar
 *   add-event sheet on phones). Used on event cards.
 * - variant="full": a dropdown offering Google Calendar + Apple/Outlook (.ics).
 *   Used on the event detail page.
 */
export default function AddToCalendar({ event, variant = 'full' }: { event: CalEvent; variant?: 'full' | 'compact' }) {
  const [open, setOpen] = useState(false)

  function downloadIcs(e?: React.MouseEvent) {
    e?.preventDefault()
    e?.stopPropagation()
    const blob = new Blob([icsContent(event)], { type: 'text/calendar;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${event.slug}.ics`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setOpen(false)
  }

  if (variant === 'compact') {
    return (
      <button
        onClick={downloadIcs}
        aria-label={`Add ${event.title} to your calendar`}
        title="Add to calendar"
        className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-green-600 transition-colors"
      >
        📅 Add
      </button>
    )
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        📅 Add to calendar <span className="text-gray-400">▾</span>
      </button>

      {open && (
        <>
          {/* click-away backdrop */}
          <button className="fixed inset-0 z-10 cursor-default" aria-hidden="true" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-lg overflow-hidden">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              📆 Google Calendar
            </a>
            <button
              onClick={downloadIcs}
              className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
            >
              🍎 Apple / Outlook (.ics)
            </button>
          </div>
        </>
      )}
    </div>
  )
}
