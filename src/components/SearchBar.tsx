'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'

const PLACEHOLDERS = [
  "Try 'biltong in Sydney'...",
  "Try 'boerewors in London'...",
  "Try 'South African food in Toronto'...",
  "Try 'braai supplies in New Zealand'...",
  "Try 'koeksisters near me'...",
  "Try 'SA grocery shop in Dubai'...",
]

export default function SearchBar() {
  const [query, setQuery] = useState('')
  const [placeholderIndex, setPlaceholderIndex] = useState(0)
  const router = useRouter()

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % PLACEHOLDERS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [])

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
        placeholder={PLACEHOLDERS[placeholderIndex]}
        className="flex-1 px-5 py-3 rounded-l-xl border border-white/40 focus:outline-none focus:border-white bg-white/15 text-white placeholder:text-white/70 text-sm backdrop-blur-sm transition-all"
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
