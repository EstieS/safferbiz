'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a business, product, or service..."
        className="flex-1 px-5 py-3 rounded-l-xl border border-white/40 focus:outline-none focus:border-white bg-white/15 text-white placeholder:text-white/70 text-sm backdrop-blur-sm"
      />
      <button
        type="submit"
        className="px-6 py-3 rounded-r-xl font-medium text-sm transition-colors bg-white hover:bg-gray-100"
        style={{ color: '#007A4D' }}
      >
        Search
      </button>
    </form>
  )
}
