'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { EVENT_CATEGORIES, COUNTRIES } from '@/lib/constants'

export default function EventFilters() {
  const router = useRouter()
  const params = useSearchParams()

  const country = params.get('country') ?? ''
  const category = params.get('category') ?? ''
  const when = params.get('when') ?? ''
  const city = params.get('city') ?? ''

  function update(key: string, value: string) {
    const p = new URLSearchParams(params.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push(`/events?${p.toString()}`)
  }

  const hasFilters = country || category || when || city

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Upcoming / Past toggle */}
      <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
        <button
          onClick={() => update('when', '')}
          className={`px-4 py-2 font-medium transition-colors ${!when || when === 'upcoming' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Upcoming
        </button>
        <button
          onClick={() => update('when', 'past')}
          className={`px-4 py-2 font-medium transition-colors ${when === 'past' ? 'bg-green-700 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
        >
          Past
        </button>
      </div>

      {/* Category */}
      <select
        value={category}
        onChange={(e) => update('category', e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white"
      >
        <option value="">All categories</option>
        {EVENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* Country */}
      <select
        value={country}
        onChange={(e) => update('country', e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white"
      >
        <option value="">All countries</option>
        {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </select>

      {/* City */}
      <input
        type="text"
        placeholder="Filter by city..."
        defaultValue={city}
        onKeyDown={(e) => { if (e.key === 'Enter') update('city', (e.target as HTMLInputElement).value) }}
        onBlur={(e) => update('city', e.target.value)}
        className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 bg-white w-36"
      />

      {hasFilters && (
        <button
          onClick={() => router.push('/events')}
          className="px-3 py-2 text-sm text-gray-500 hover:text-red-600"
        >
          Clear ✕
        </button>
      )}
    </div>
  )
}
