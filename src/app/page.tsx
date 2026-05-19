import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import NewsletterBanner from '@/components/NewsletterBanner'
import { CATEGORIES, COUNTRIES, PRODUCT_TAGS } from '@/lib/constants'
import type { Listing } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  const [{ data: recentListings }, { count: totalListings }, { data: countryRows }, { count: totalEvents }] =
    await Promise.all([
      supabase
        .from('listings')
        .select('*')
        .eq('status', 'active')
        .order('approved_at', { ascending: false, nullsFirst: false })
        .limit(4),
      supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active'),
      supabase
        .from('listings')
        .select('country')
        .eq('status', 'active'),
      supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active')
        .gte('event_date', new Date().toISOString().slice(0, 10)),
    ])

  const listings = (recentListings ?? []) as Listing[]
  const countryCount = new Set((countryRows ?? []).map((r) => r.country).filter(Boolean)).size

  return (
    <div>
      {/* Hero */}
      <section
        className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #007A4D 0%, #005a38 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-green-200 text-sm font-medium uppercase tracking-widest mb-3">
            Built by Saffers, for Saffers living abroad
          </p>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Find South African Businesses<br />
            <span style={{ color: '#FFB612' }}>Wherever You Are</span>
          </h1>
          <p className="text-green-100 text-lg mb-6 max-w-2xl mx-auto">
            The directory for SA expats. Find biltong, boerewors, gifts from home,
            and South African-owned businesses around the world.
          </p>

          {/* Live stats */}
          <div className="flex items-center justify-center gap-6 mb-8">
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{totalListings ?? 0}</p>
              <p className="text-green-200 text-xs uppercase tracking-wide">Businesses</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{countryCount}</p>
              <p className="text-green-200 text-xs uppercase tracking-wide">Countries</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold text-white">{totalEvents ?? 0}</p>
              <p className="text-green-200 text-xs uppercase tracking-wide">Upcoming Events</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: '#FFB612' }}>Free</p>
              <p className="text-green-200 text-xs uppercase tracking-wide">To list</p>
            </div>
          </div>

          <SearchBar />
        </div>
      </section>

      {/* Recent listings — shown first so visitors see real businesses immediately */}
      <section className="py-12 px-4 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recently Added</h2>
            <Link href="/search" className="text-sm font-medium hover:underline" style={{ color: '#007A4D' }}>
              View all →
            </Link>
          </div>

          {listings.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg">No listings yet.</p>
              <Link
                href="/submit"
                className="mt-4 inline-block text-sm font-medium text-white px-6 py-3 rounded-lg"
                style={{ backgroundColor: '#007A4D' }}
              >
                Be the first to list your business
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {listings.map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Category pills */}
      <section className="py-10 px-4 bg-green-50 border-b border-green-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px flex-1 max-w-16 bg-green-200" />
            <h2 className="text-sm font-bold text-green-800 uppercase tracking-widest">
              Browse by Category
            </h2>
            <div className="h-px flex-1 max-w-16 bg-green-200" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}`}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-green-500 hover:text-green-700 hover:bg-green-50 transition-all bg-white"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Country pills */}
      <section className="py-10 px-4 bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px flex-1 max-w-16 bg-blue-900" />
            <h2 className="text-sm font-bold uppercase tracking-widest text-blue-900">
              Browse by Country
            </h2>
            <div className="h-px flex-1 max-w-16 bg-blue-900" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {COUNTRIES.map((country) => (
              <Link
                key={country}
                href={`/country/${encodeURIComponent(country.toLowerCase().replace(/ /g, '-'))}`}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 text-gray-700 hover:border-blue-900 hover:text-white hover:bg-blue-900 transition-all bg-white"
              >
                {country}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Online stores CTA */}
      <section className="py-6 px-4 bg-blue-50 border-b border-blue-100">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-blue-900 text-sm">🛒 Shop from home — wherever you are</p>
            <p className="text-xs text-blue-700 mt-0.5">Browse SA businesses that accept online orders and deliver to you</p>
          </div>
          <Link
            href="/online"
            className="flex-shrink-0 px-5 py-2 rounded-full text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            View Online Stores →
          </Link>
        </div>
      </section>

      {/* Popular products */}
      <section className="py-10 px-4 bg-red-50 border-b border-red-100">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-5">
            <div className="h-px flex-1 max-w-16 bg-red-600" />
            <h2 className="text-sm font-bold text-red-600 uppercase tracking-widest">
              Search by Product
            </h2>
            <div className="h-px flex-1 max-w-16 bg-red-600" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {PRODUCT_TAGS.slice(0, 12).map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="px-4 py-2 rounded-full text-sm font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all"
              >
                {tag}
              </Link>
            ))}
            <Link
              href="/search"
              className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
            >
              More →
            </Link>
          </div>
        </div>
      </section>

      <NewsletterBanner />

      {/* CTA */}
      <section className="py-14 px-4 bg-white border-t border-gray-100">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Own a South African Business?</h2>
          <p className="text-gray-600 mb-6">
            Get discovered by SA expats worldwide. Add your business to SafferBiz — it&apos;s free.
          </p>
          <Link
            href="/submit"
            className="inline-block text-white font-semibold px-8 py-3 rounded-xl transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#007A4D' }}
          >
            List Your Business Free
          </Link>
        </div>
      </section>
    </div>
  )
}
