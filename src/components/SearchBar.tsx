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

interface SearchBarProps {
  /** 'dark' = hero (white text on green), 'light' = page (gray text on white). Default: 'dark' */
  variant?: 'dark' | 'light'
  /** Pre-fill the input with an existing query */
  defaultValue?: string
}

export default function SearchBar({ variant = 'dark', defaultValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue)
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
    router.push(`/search?q=${encodeURIComponent(query.trim())}`)
  }

  const isDark = variant === 'dark'

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-2xl mx-auto">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={PLACEHOLDERS[placeholderIndex]}
        className={[
          'flex-1 px-5 py-3 rounded-l-xl text-sm transition-all focus:outline-none',
          isDark
            ? 'border border-white/40 focus:border-white bg-white/15 text-white placeholder:text-white/70 backdrop-blur-sm'
            : 'border border-gray-300 focus:border-green-600 bg-white text-gray-900 placeholder:text-gray-400 shadow-sm',
        ].join(' ')}
      />
      <button
        type="submit"
        className={[
          'px-6 py-3 rounded-r-xl font-medium text-sm transition-colors',
          isDark
            ? 'bg-white hover:bg-gray-100'
            : 'text-white hover:opacity-90',
        ].join(' ')}
        style={isDark ? { color: '#007A4D' } : { backgroundColor: '#007A4D' }}
      >
        Search
      </button>
    </form>
  )
}
