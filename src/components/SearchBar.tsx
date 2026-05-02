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
        className="flex-1 px-5 py-3 rounded-l-xl border border-gray-300 focus:outline-none focus:border-green-500 text-gray-800 text-sm"
      />
      <button
        type="submit"
        className="px-6 py-3 rounded-r-xl text-white font-medium text-sm transition-colors"
        style={{ backgroundColor: '#007A4D' }}
      >
        Search
      </button>
    </form>
  )
}
