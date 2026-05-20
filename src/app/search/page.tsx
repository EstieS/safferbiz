import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import { PRODUCT_TAGS, COUNTRIES } from '@/lib/constants'
import type { Listing } from '@/lib/types'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams
  return {
    title: q ? `Search results for "${q}"` : 'Search',
  }
}

// ─── Smart query parser ───────────────────────────────────────────────────────
// Understands "biltong in USA", "boerewors near London", "SA food Australia"

const COUNTRY_ALIASES: Record<string, string> = {
  'usa':        'United States',
  'us':         'United States',
  'america':    'United States',
  'uk':         'United Kingdom',
  'britain':    'United Kingdom',
  'england':    'United Kingdom',
  'scotland':   'United Kingdom',
  'wales':      'United Kingdom',
  'nz':         'New Zealand',
  'au':         'Australia',
  'aus':        'Australia',
  'sa':         'South Africa',
  'rsa':        'South Africa',
  'uae':        'United Arab Emirates',
  'emirates':   'United Arab Emirates',
  'holland':    'Netherlands',
  'deutschland':'Germany',
  'eire':       'Ireland',
  'singapore':  'Singapore',
}

const STOP_WORDS = new Set(['in', 'near', 'from', 'at', 'around', 'the'])

function parseQuery(raw: string): { terms: string; country: string | null } {
  // First check for multi-word country names (e.g. "New Zealand", "United States")
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

  // Tokenise what's left and check for aliases + stop words
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

  return {
    terms: searchTokens.join(' ').trim(),
    country,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let listings: Listing[] = []
  let parsedTerms = query
  let parsedCountry: string | null = null
  let totalCount = 0

  if (!query) {
    // No query — show all listings A→Z
    const supabase = await createServerSupabaseClient()
    const { data, count } = await supabase
      .from('listings')
      .select('*', { count: 'exact' })
      .eq('status', 'active')
      .order('business_name', { ascending: true })
      .limit(100)
    listings = (data ?? []) as Listing[]
    totalCount = count ?? 0
  }

  if (query) {
    const supabase = await createServerSupabaseClient()
    const { terms, country } = parseQuery(query)
    parsedTerms = terms
    parsedCountry = country

    const searchText = terms || query // fall back to full query if terms is empty

    // Helper to build the base query with optional country filter
    function base() {
      let q = supabase.from('listings').select('*').eq('status', 'active')
      if (country) q = q.eq('country', country)
      return q
    }

    const tagVariants = searchText
      ? [
          searchText,
          searchText.charAt(0).toUpperCase() + searchText.slice(1).toLowerCase(),
        ]
      : []

    const [textRes, ...tagResults] = await Promise.all([
      // Text search across name, description, city
      base().or(
        `business_name.ilike.%${searchText}%,description.ilike.%${searchText}%,city.ilike.%${searchText}%`
      ),
      // Tag searches
      ...tagVariants.map((v) => base().contains('tags', [v])),
    ])

    // If country-only search (no terms), also fetch all businesses in that country
    const countryOnlyResults =
      country && !terms
        ? await base().order('business_name')
        : null

    // Merge and deduplicate
    const seen = new Set<string>()
    const merged: Listing[] = []
    const allResults = [
      ...(textRes.data ?? []),
      ...tagResults.flatMap((r) => r.data ?? []),
      ...(countryOnlyResults?.data ?? []),
    ] as Listing[]

    for (const item of allResults) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(item)
      }
    }

    listings = merged.sort((a, b) => a.business_name.localeCompare(b.business_name))
  }

  // Build a human-readable description of what was searched
  const searchDescription = parsedCountry && parsedTerms
    ? `"${parsedTerms}" in ${parsedCountry}`
    : parsedCountry
    ? `businesses in ${parsedCountry}`
    : `"${query}"`

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <SearchBar />
      </div>

      {!query && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              All Businesses
              <span className="ml-2 text-base font-normal text-gray-400">({totalCount})</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {totalCount > 100 && (
            <p className="text-center text-sm text-gray-400">
              Showing first 100 results. Use the search bar to find specific businesses.
            </p>
          )}
          <div className="border-t border-gray-100 pt-8">
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
        </div>
      )}

      {query && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Results for {searchDescription}
          </h1>
          {/* Show how query was interpreted if it was parsed */}
          {(parsedCountry || parsedTerms !== query) && (
            <p className="text-sm text-gray-400 mb-2">
              {parsedTerms && <span>Searching <strong>{parsedTerms}</strong></span>}
              {parsedTerms && parsedCountry && <span> · </span>}
              {parsedCountry && <span>Country: <strong>{parsedCountry}</strong></span>}
            </p>
          )}
          <p className="text-gray-500 mb-8">
            {listings.length} {listings.length === 1 ? 'result' : 'results'} found
          </p>

          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No businesses found matching {searchDescription}.</p>
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
        </>
      )}
    </div>
  )
}
