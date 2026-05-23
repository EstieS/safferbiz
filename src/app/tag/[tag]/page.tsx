import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import SearchFilters from '@/components/SearchFilters'
import { COUNTRIES, CATEGORIES } from '@/lib/constants'
import type { Listing } from '@/lib/types'
import Link from 'next/link'

interface Props {
  params: Promise<{ tag: string }>
  searchParams: Promise<{ country?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  const label = decodeURIComponent(tag)
  return {
    title: `South African Businesses selling ${label} Worldwide`,
    description: `Find South African businesses and shops that sell ${label} around the world. The SA expat directory for ${label}.`,
  }
}

export default async function TagPage({ params, searchParams }: Props) {
  const { tag } = await params
  const { country: countryFilter } = await searchParams
  const label = decodeURIComponent(tag)

  const supabase = await createServerSupabaseClient()

  let qb = supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .contains('tags', [label])
    .order('business_name')

  if (countryFilter) qb = qb.eq('country', countryFilter)

  const { data } = await qb
  const listings = (data ?? []) as Listing[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-6">
        <p className="text-sm text-gray-500 mb-1">Product Search</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          Businesses selling <span style={{ color: '#007A4D' }}>{label}</span>
        </h1>
        <p className="text-gray-500 text-sm">
          {listings.length} {listings.length === 1 ? 'business' : 'businesses'} found
          {countryFilter ? ` in ${countryFilter}` : ' worldwide'}
        </p>
      </div>

      {/* Country filter */}
      <div className="mb-6 flex items-center gap-4">
        <SearchFilters
          countries={[...COUNTRIES]}
          categories={[...CATEGORIES]}
          selectedCountry={countryFilter ?? ''}
          selectedCategory=""
          currentQuery=""
          showCategory={false}
          basePath={`/tag/${encodeURIComponent(tag)}`}
        />
        {countryFilter && (
          <Link
            href={`/tag/${encodeURIComponent(tag)}`}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            Clear ×
          </Link>
        )}
      </div>

      {listings.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">
          No businesses selling &ldquo;{label}&rdquo;{countryFilter ? ` in ${countryFilter}` : ''} yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}
    </div>
  )
}
