import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'

export default async function Footer() {
  const supabase = await createServerSupabaseClient()

  // Fetch active listings to count by category and country
  const { data: listings } = await supabase
    .from('listings')
    .select('category, country')
    .eq('status', 'active')

  // Count and sort categories
  const categoryCounts: Record<string, number> = {}
  const countryCounts: Record<string, number> = {}

  for (const l of listings ?? []) {
    if (l.category) categoryCounts[l.category] = (categoryCounts[l.category] ?? 0) + 1
    if (l.country) countryCounts[l.country] = (countryCounts[l.country] ?? 0) + 1
  }

  const topCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([cat]) => cat)

  const topCountries = Object.entries(countryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([country]) => country)

  return (
    <footer className="bg-gray-900 text-gray-300 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1">
            <Link href="/" className="text-2xl font-bold">
              <span style={{ color: '#007A4D' }}>Saffer</span>
              <span style={{ color: '#FFB612' }}>Biz</span>
            </Link>
            <p className="mt-3 text-sm text-gray-400">
              The online directory for South African businesses around the world.
              Find your favourite SA products and services, wherever you are.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Categories</h3>
            <ul className="space-y-2">
              {topCategories.map((cat) => (
                <li key={cat}>
                  <Link
                    href={`/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}`}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Countries</h3>
            <ul className="space-y-2">
              {topCountries.map((country) => (
                <li key={country}>
                  <Link
                    href={`/country/${encodeURIComponent(country.toLowerCase().replace(/ /g, '-'))}`}
                    className="text-sm hover:text-white transition-colors"
                  >
                    {country}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/submit" className="text-sm hover:text-white transition-colors">List Your Business</Link></li>
              <li><Link href="/subscribe" className="text-sm hover:text-white transition-colors">Get Alerts</Link></li>
              <li><Link href="/events" className="text-sm hover:text-white transition-colors">Events</Link></li>
              <li><Link href="/about" className="text-sm hover:text-white transition-colors">About</Link></li>
            </ul>

            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mt-6 mb-3">Connect With Us</h3>
            <div className="flex items-center gap-3">
              <a
                href="https://www.facebook.com/profile.php?id=61589519001893"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SafferBiz on Facebook"
                className="hover:text-white transition-colors"
                style={{ color: '#007A4D' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M22 12c0-5.522-4.477-10-10-10S2 6.478 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987H7.898V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                </svg>
              </a>
              <a
                href="https://www.instagram.com/safferbiz/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="SafferBiz on Instagram"
                className="hover:text-white transition-colors"
                style={{ color: '#007A4D' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-xs text-gray-500">
            © {new Date().getFullYear()} SafferBiz. All rights reserved.
          </p>
          <div className="flex gap-1 h-2">
            <div className="w-8" style={{ backgroundColor: '#DE3831' }} />
            <div className="w-8" style={{ backgroundColor: '#FFFFFF' }} />
            <div className="w-8" style={{ backgroundColor: '#007A4D' }} />
            <div className="w-8" style={{ backgroundColor: '#FFB612' }} />
            <div className="w-8" style={{ backgroundColor: '#002395' }} />
            <div className="w-8" style={{ backgroundColor: '#000000' }} />
          </div>
        </div>
      </div>
    </footer>
  )
}
