import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import SearchBar from '@/components/SearchBar'
import { PRODUCT_TAGS } from '@/lib/constants'
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

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const query = q?.trim() ?? ''

  let listings: Listing[] = []

  if (query) {
    const supabase = await createServerSupabaseClient()

    // Search by name, description, city
    const { data: textResults } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .or(`business_name.ilike.%${query}%,description.ilike.%${query}%,city.ilike.%${query}%`)
      .order('business_name')

    // Also search by tags (case-sensitive contains, so we try both cases)
    const tagVariants = [
      query,
      query.charAt(0).toUpperCase() + query.slice(1).toLowerCase(),
    ]
    const tagSets = await Promise.all(
      tagVariants.map((v) =>
        supabase
          .from('listings')
          .select('*')
          .eq('status', 'active')
          .contains('tags', [v])
      )
    )

    // Merge and deduplicate by id
    const seen = new Set<string>()
    const merged: Listing[] = []
    for (const item of [
      ...(textResults ?? []),
      ...tagSets.flatMap((r) => r.data ?? []),
    ] as Listing[]) {
      if (!seen.has(item.id)) {
        seen.add(item.id)
        merged.push(item)
      }
    }
    listings = merged.sort((a, b) => a.business_name.localeCompare(b.business_name))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <SearchBar />
      </div>

      {!query && (
        <div>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Browse by Product
          </h2>
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

      {query && (
        <>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Results for &ldquo;{query}&rdquo;
          </h1>
          <p className="text-gray-500 mb-8">
            {listings.length} {listings.length === 1 ? 'result' : 'results'} found
          </p>

          {listings.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-400 mb-4">No businesses found matching &ldquo;{query}&rdquo;.</p>
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
