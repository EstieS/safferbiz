// Build "Add to calendar" links from an event — Google Calendar URL + .ics content.
// Uses floating local time (the event's wall-clock time) since events don't
// carry a timezone; if there's no parseable time, it becomes an all-day event.

const SITE = 'https://safferbiz.com'

export interface CalEvent {
  title: string
  slug: string
  description: string | null
  event_date: string            // YYYY-MM-DD
  event_end_date: string | null
  event_time: string | null     // e.g. "2:00 PM", "14:30", or null
  venue: string | null
  city: string | null
  country: string | null
}

function parseTime(t: string | null): { h: number; m: number } | null {
  if (!t) return null
  // For ranges like "5PM – 9PM" or "12:00 - 16:30", use the start time
  const s = t.trim().split(/\s*[-–—]\s*/)[0].trim()
  const ampm = s.match(/^(\d{1,2})(?::(\d{2}))?\s*([ap])\.?m\.?$/i)
  if (ampm) {
    let h = parseInt(ampm[1], 10)
    const m = ampm[2] ? parseInt(ampm[2], 10) : 0
    const pm = /p/i.test(ampm[3])
    if (h === 12) h = pm ? 12 : 0
    else if (pm) h += 12
    return { h: h % 24, m }
  }
  const h24 = s.match(/^(\d{1,2}):(\d{2})$/)
  if (h24) return { h: parseInt(h24[1], 10) % 24, m: parseInt(h24[2], 10) }
  return null
}

const pad = (n: number) => String(n).padStart(2, '0')

function dtFloat(dateStr: string, h: number, m: number) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return `${y}${pad(mo)}${pad(d)}T${pad(h)}${pad(m)}00`
}
function dateStamp(dateStr: string) {
  const [y, mo, d] = dateStr.split('-').map(Number)
  return `${y}${pad(mo)}${pad(d)}`
}
function addDays(dateStr: string, days: number) {
  const dt = new Date(dateStr + 'T00:00:00')
  dt.setDate(dt.getDate() + days)
  return dt.toISOString().slice(0, 10)
}

function location(e: CalEvent) {
  return [e.venue, e.city, e.country].filter(Boolean).join(', ')
}
function details(e: CalEvent) {
  return [e.description, `More info: ${SITE}/events/${e.slug}`].filter(Boolean).join('\n\n')
}

/** Compute start/end as either timed (floating) or all-day (date-only). */
function range(e: CalEvent) {
  const time = parseTime(e.event_time)
  if (time) {
    const start = dtFloat(e.event_date, time.h, time.m)
    const end = e.event_end_date && e.event_end_date !== e.event_date
      ? dtFloat(e.event_end_date, time.h, time.m)
      : dtFloat(e.event_date, Math.min(time.h + 2, 23), time.m) // default 2h
    return { allDay: false, start, end }
  }
  const endDate = e.event_end_date && e.event_end_date !== e.event_date ? e.event_end_date : e.event_date
  return { allDay: true, start: dateStamp(e.event_date), end: dateStamp(addDays(endDate, 1)) } // end exclusive
}

export function googleCalendarUrl(e: CalEvent): string {
  const r = range(e)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${r.start}/${r.end}`,
    details: details(e),
    location: location(e),
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

function icsEscape(s: string) {
  return (s ?? '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

export function icsContent(e: CalEvent): string {
  const r = range(e)
  const dtStart = r.allDay ? `DTSTART;VALUE=DATE:${r.start}` : `DTSTART:${r.start}`
  const dtEnd = r.allDay ? `DTEND;VALUE=DATE:${r.end}` : `DTEND:${r.end}`
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').replace(/(\d{8}T\d{6}).*/, '$1Z')
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SafferBiz//Events//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${e.slug}@safferbiz.com`,
    `DTSTAMP:${stamp}`,
    dtStart,
    dtEnd,
    `SUMMARY:${icsEscape(e.title)}`,
    `DESCRIPTION:${icsEscape(details(e))}`,
    `LOCATION:${icsEscape(location(e))}`,
    `URL:${SITE}/events/${e.slug}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')
}
