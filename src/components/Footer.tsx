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
