'use client'

import { useState } from 'react'
import type { Event } from '@/lib/types'
import { COUNTRIES } from '@/lib/constants'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function EventManageForm({ event, token }: { event: Event; token: string }) {
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [fields, setFields] = useState({
    title: event.title ?? '',
    description: event.description ?? '',
    event_date: event.event_date ?? '',
    event_end_date: event.event_end_date ?? '',
    event_time: event.event_time ?? '',
    venue: event.venue ?? '',
    city: event.city ?? '',
    country: event.country ?? '',
    url: event.url ?? '',
    facebook_url: event.facebook_url ?? '',
    instagram_url: event.instagram_url ?? '',
  })

  // Reset the "Saved" state as soon as the organiser edits again
  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    setState((s) => (s === 'idle' || s === 'loading' ? s : 'idle'))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/manage/event/${event.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...fields }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong')
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  const input = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500'
  const label = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className={label}>Event Title <span className="text-red-500">*</span></label>
        <input required value={fields.title} onChange={(e) => set('title', e.target.value)} className={input} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea rows={4} value={fields.description} onChange={(e) => set('description', e.target.value)} className={`${input} resize-none`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-red-600 mb-1">Start Date <span className="text-red-500">★</span></label>
          <input type="date" required value={fields.event_date} onChange={(e) => set('event_date', e.target.value)}
            className="w-full px-4 py-2 border border-red-300 bg-red-50 rounded-lg text-sm focus:outline-none focus:border-red-500" />
        </div>
        <div>
          <label className={label}>End Date (optional)</label>
          <input type="date" value={fields.event_end_date} onChange={(e) => set('event_end_date', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Time (optional)</label>
          <input type="time" value={fields.event_time} onChange={(e) => set('event_time', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Venue</label>
          <input value={fields.venue} onChange={(e) => set('venue', e.target.value)} className={input} placeholder="e.g. SA Club Hall" />
        </div>
        <div>
          <label className={label}>City</label>
          <input value={fields.city} onChange={(e) => set('city', e.target.value)} className={input} />
        </div>
        <div>
          <label className={label}>Country</label>
          <select value={fields.country} onChange={(e) => set('country', e.target.value)} className={`${input} bg-white`}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className={label}>Event / Tickets URL</label>
        <input type="url" value={fields.url} onChange={(e) => set('url', e.target.value)} className={input} placeholder="https://..." />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label}>Facebook URL</label>
          <input type="url" value={fields.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} className={input} placeholder="https://facebook.com/..." />
        </div>
        <div>
          <label className={label}>Instagram URL</label>
          <input type="url" value={fields.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} className={input} placeholder="https://instagram.com/..." />
        </div>
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>
      )}

      {state === 'success' && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 px-4 py-3 rounded-lg font-medium">
          ✓ Saved! Your event has been updated — changes are live now.
        </p>
      )}

      <button type="submit" disabled={state === 'loading'}
        className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-60 ${state === 'success' ? 'bg-green-600' : ''}`}
        style={state === 'success' ? undefined : { backgroundColor: '#007A4D' }}>
        {state === 'loading' ? 'Saving...' : state === 'success' ? '✓ Saved' : 'Save Changes'}
      </button>
    </form>
  )
}
