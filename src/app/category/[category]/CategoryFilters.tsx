'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { COUNTRIES } from '@/lib/constants'

export default function CategoryFilters({ onlineCount }: { onlineCount: number }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const country = searchParams.get('country') ?? ''
  const onlineOnly = searchParams.get('online') === '1'
  const sort = searchParams.get('sort') ?? 'az'

  function update(key: string, value: string) {
    const p = new URLSearchParams(searchParams.toString())
    if (value) p.set(key, value)
    else p.delete(key)
    router.push('?' + p.toString(), { scroll: false })
  }

  return (
    <div className="flex flex-wrap gap-3 items-center mb-8">
      {/* Sort */}
      <select
        value={sort}
        onChange={e => update('sort', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-green-500"
      >
        <option value="az">A → Z</option>
        <option value="za">Z → A</option>
        <option value="newest">Newest first</option>
      </select>

      {/* Country filter */}
      <select
        value={country}
        onChange={e => update('country', e.target.value)}
        className="px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:border-green-500"
      >
        <option value="">All countries</option>
        {COUNTRIES.filter(c => c !== 'Other').map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>

      {/* Online only toggle */}
      {onlineCount > 0 && (
        <button
          onClick={() => update('online', onlineOnly ? '' : '1')}
          className={`px-3 py-2 text-sm rounded-lg border font-medium transition-all ${
            onlineOnly
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:border-blue-400'
          }`}
        >
          🛒 Online only {onlineOnly ? '' : `(${onlineCount})`}
        </button>
      )}

      {/* Clear filters */}
      {(country || onlineOnly || sort !== 'az') && (
        <button
          onClick={() => router.push('?', { scroll: false })}
          className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 underline"
        >
          Clear
        </button>
      )}
    </div>
  )
}
