import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import { CATEGORIES, COUNTRIES, PRODUCT_TAGS } from '@/lib/constants'
import type { Listing } from '@/lib/types'

export default async function HomePage() {
  const supabase = await createServerSupabaseClient()

  const { data: recentListings } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(8)

  const listings = (recentListings ?? []) as Listing[]

  return (
    <div>
      {/* Hero */}
      <section
        className="py-20 px-4"
        style={{ background: 'linear-gradient(135deg, #007A4D 0%, #005a38 100%)' }}
      >
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Find South African Businesses<br />
            <span style={{ color: '#FFB612' }}>Wherever You Are</span>
          </h1>
          <p className="text-green-100 text-lg mb-8 max-w-2xl mx-auto">
            The directory for SA expats. Find biltong, boerewors, gifts from home,
            and South African-owned businesses around the world.
          </p>
          <SearchBar />
        </div>
      </section>

      {/* Category pills */}
      <section className="py-10 px-4 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
            Browse by Category
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat}
                href={`/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}`}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 hover:border-green-500 hover:text-green-700 transition-colors bg-white"
              >
                {cat}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Country pills */}
      <section className="py-8 px-4 bg-gray-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
            Browse by Country
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {COUNTRIES.map((country) => (
              <Link
                key={country}
                href={`/country/${encodeURIComponent(country.toLowerCase().replace(/ /g, '-'))}`}
                className="px-4 py-2 rounded-full text-sm font-medium border border-gray-200 hover:border-green-500 hover:text-green-700 transition-colors bg-white"
              >
                {country}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular products */}
      <section className="py-8 px-4 bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 text-center">
            Search by Product
          </h2>
          <div className="flex flex-wrap gap-2 justify-center">
            {PRODUCT_TAGS.slice(0, 12).map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="px-4 py-2 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
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

      {/* Recent listings */}
      <section className="py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Recently Added</h2>
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
