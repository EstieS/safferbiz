'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { CATEGORIES, COUNTRIES } from '@/lib/constants'

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="SafferBiz" width={36} height={36} className="rounded-md" />
            <span className="text-2xl font-bold" style={{ color: '#007A4D' }}>
              Saffer<span style={{ color: '#FFB612' }}>Biz</span>
            </span>
            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-300 leading-tight">
              Beta
            </span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            <div className="relative group">
              <button className="text-gray-700 hover:text-green-700 font-medium text-sm">
                Categories
              </button>
              <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {CATEGORIES.map((cat) => (
                  <Link
                    key={cat}
                    href={`/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative group">
              <button className="text-gray-700 hover:text-green-700 font-medium text-sm">
                Countries
              </button>
              <div className="absolute left-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {COUNTRIES.map((country) => (
                  <Link
                    key={country}
                    href={`/country/${encodeURIComponent(country.toLowerCase().replace(/ /g, '-'))}`}
                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 first:rounded-t-lg last:rounded-b-lg"
                  >
                    {country}
                  </Link>
                ))}
              </div>
            </div>

            <Link href="/events" className="text-sm font-medium text-gray-700 hover:text-red-600">
              🎉 Events
            </Link>
            <Link
              href="/near-me"
              className="text-sm font-medium text-gray-700 hover:text-green-700 flex items-center gap-1"
            >
              📍 Near Me
            </Link>
            <Link
              href="/submit"
              className="text-sm font-medium text-white px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#007A4D' }}
            >
              List Your Business
            </Link>
          </div>

          <button
            className="md:hidden p-2 rounded-md text-gray-600"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              }
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-3 space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-1">Categories</p>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}`}
              className="block py-1 text-sm text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              {cat}
            </Link>
          ))}
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider pt-2">Countries</p>
          {COUNTRIES.map((country) => (
            <Link
              key={country}
              href={`/country/${encodeURIComponent(country.toLowerCase().replace(/ /g, '-'))}`}
              className="block py-1 text-sm text-gray-700"
              onClick={() => setMenuOpen(false)}
            >
              {country}
            </Link>
          ))}
          <Link href="/events" className="block py-1 text-sm font-medium text-gray-700" onClick={() => setMenuOpen(false)}>
            🎉 Events
          </Link>
          <Link
            href="/near-me"
            className="block py-1 text-sm font-medium text-gray-700"
            onClick={() => setMenuOpen(false)}
          >
            📍 Near Me
          </Link>
          <Link
            href="/submit"
            className="block mt-2 text-center text-sm font-medium text-white px-4 py-2 rounded-lg"
            style={{ backgroundColor: '#007A4D' }}
            onClick={() => setMenuOpen(false)}
          >
            List Your Business
          </Link>
        </div>
      )}
    </nav>
  )
}
