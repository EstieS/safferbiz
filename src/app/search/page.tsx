import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import SearchFilters from '@/components/SearchFilters'
import { PRODUCT_TAGS, COUNTRIES, CATEGORIES } from '@/lib/constants'
import type { Listing } from '@/lib/types'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ q?: string; country?: string; category?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `Search results for "${q}"` : 'Search',
  }
}

// ─── Smart query parser ───────────────────────────────────────────────────────

const COUNTRY_ALIASES: Record<string, string> = {
  'usa':         'United States',
  'us':          'United States',
  'america':     'United States',
  'uk':          'United Kingdom',
  'britain':     'United Kingdom',
  'england':     'United Kingdom',
  'scotland':    'United Kingdom',
  'wales':       'United Kingdom',
  'nz':          'New Zealand',
  'au':          'Australia',
  'aus':         'Australia',
  'sa':          'South Africa',
  'rsa':         'South Africa',
  'uae':         'United Arab Emirates',
  'emirates':    'United Arab Emirates',
  'holland':     'Netherlands',
  'deutschland': 'Germany',
  'eire':        'Ireland',
  'singapore':   'Singapore',
}

const STOP_WORDS = new Set(['in', 'near', 'from', 'at', 'around', 'the'])

function parseQuery(raw: string): { terms: string; country: string | null } {
  let remaining = raw
  let country: string | null = null

  for (const c of COUNTRIES) {
    const regex = new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    if (regex.test(remaining)) {
      country = c
      remaining = remaining.replace(regex, ' ')
      break
    }
  }

  const tokens = remaining.trim().split(/\s+/).filter(Boolean)
  const searchTokens: string[] = []

  for (const token of tokens) {
    const lower = token.toLowerCase()
    if (STOP_WORDS.has(lower)) continue
    if (!country && COUNTRY_ALIASES[lower]) {
      country = COUNTRY_ALIASES[lower]
      continue
    }
    searchTokens.push(token)
  }

  return { terms: searchTokens.join(' ').trim(), country }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SearchPage({ searchParams }: Props) {
  const { q, country: countryFilter, category: categoryFilter } = await searchParams
  const query = q?.trim() ?? ''

  const supabase = await createServerSupabaseClient()

  let listings: Listing[] = []
  let totalCount = 0
  let parsedTerms = ''
  let parsedCountry: string | null = null

  if (!query) {
    // No text — show all, applying dropdown filters only
    // Build with count by not using the base() helper (which already calls select)
    let listQb = supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('business_name', { ascending: true })
      .limit(200)
    if (countryFilter) listQb = listQb.eq('country', countryFilter)
    if (categoryFilter) listQb = listQb.eq('category', categoryFilter)

    const { data, count } = await listQb
    listings = (data ?? []) as Listing[]
    totalCount = count ?? listings.length
  } else {
    const { terms, country: smartCountry } = parseQuery(query)
    parsedTerms = terms
    // Dropdown country takes precedence over smart-parsed country
    parsedCountry = countryFilter ? null : smartCountry
    const effectiveCountry = countryFilter ?? smartCountry
    const searchText = terms || query

    function searchBase() {
      let qb = supabase.from('listings').select('*').eq('status', 'active')
      if (effectiveCountry) qb = qb.eq('country', effectiveCountry)
      if (categoryFilter) qb = qb.eq('category', categoryFilter)
      return qb
    }

    const tagVariants = [
      searchText,
      searchText.charAt(0).toUpperCase() + searchText.slice(1).toLowerCase(),
    ]

    const [textRes, ...tagResults] = await Promise.all([
      searchBase().or(
        `business_name.ilike.%${searchText}%,description.ilike.%${searchText}%,city.ilike.%${searchText}%`
      ),
      ...tagVariants.map((v) => searchBase().contains('tags', [v])),
    ])

    // Country-only: fetch all businesses in that country when no text terms
    const countryOnlyResults =
      effectiveCountry && !terms
        ? await searchBase().order('business_name')
        : null

    const seen = new Set<string>()
    const merged: Listing[] = []
    for (const item of [
      ...(textRes.data ?? []),
      ...tagResults.flatMap((r) => r.data ?? []),
      ...(countryOnlyResults?.data ?? []),
    ] as Listing[]) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(item)
      }
    }

    listings = merged.sort((a, b) => a.business_name.localeCompare(b.business_name))
    totalCount = listings.length
  }

  // Human-readable result header
  const effectiveCountry = countryFilter ?? parsedCountry
  const searchDescription =
    effectiveCountry && parsedTerms
      ? `"${parsedTerms}" in ${effectiveCountry}`
      : effectiveCountry
      ? `businesses in ${effectiveCountry}`
      : query
      ? `"${query}"`
      : null

  const hasFilters = !!(countryFilter || categoryFilter)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">

      {/* Search bar — light variant, pre-filled with current query */}
      <div className="mb-5">
        <SearchBar variant="light" defaultValue={query} />
      </div>

      {/* Country + Category filter dropdowns */}
      <SearchFilters
        countries={[...COUNTRIES]}
        categories={[...CATEGORIES]}
        selectedCountry={countryFilter ?? ''}
        selectedCategory={categoryFilter ?? ''}
        currentQuery={query}
      />

      {/* Results header */}
      <div className="flex justify-between items-center mb-6 mt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {searchDescription ? `Results for ${searchDescription}` : 'All Businesses'}
            <span className="ml-2 text-base font-normal text-gray-400">({totalCount})</span>
          </h1>
          {/* Show smart-parse interpretation hint */}
          {query && !countryFilter && parsedCountry && (
            <p className="text-sm text-gray-400 mt-0.5">
              {parsedTerms && <span>Searching <strong>{parsedTerms}</strong></span>}
              {parsedTerms && parsedCountry && <span> · </span>}
              {parsedCountry && <span>Country: <strong>{parsedCountry}</strong></span>}
            </p>
          )}
        </div>
        {(query || hasFilters) && (
          <Link href="/search" className="text-sm text-gray-400 hover:text-gray-600 transition-colors">
            Clear all ×
          </Link>
        )}
      </div>

      {/* Listings grid */}
      {listings.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 mb-4">
            No businesses found{searchDescription ? ` matching ${searchDescription}` : ''}.
          </p>
          <p className="text-sm text-gray-400">Try browsing by product:</p>
          <div className="flex flex-wrap gap-2 justify-center mt-3">
            {PRODUCT_TAGS.slice(0, 8).map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="px-3 py-1 rounded-full text-sm bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      )}

      {/* Product tags — only when browsing with no active search or filters */}
      {!query && !hasFilters && (
        <div className="border-t border-gray-100 pt-8 mt-10">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Browse by Product
          </h3>
          <div className="flex flex-wrap gap-2">
            {PRODUCT_TAGS.map((tag) => (
              <Link
                key={tag}
                href={`/tag/${encodeURIComponent(tag)}`}
                className="px-4 py-2 rounded-full text-sm font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
