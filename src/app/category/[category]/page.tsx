import type { Metadata } from 'next'
import { Suspense } from 'react'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import CategoryFilters from './CategoryFilters'
import { CATEGORIES } from '@/lib/constants'
import type { Listing } from '@/lib/types'

interface Props {
  params: Promise<{ category: string }>
  searchParams: Promise<{ country?: string; online?: string; sort?: string }>
}

function slugToLabel(slug: string): string {
  return CATEGORIES.find(
    (c) => c.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-') === slug
  ) ?? slug
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { category } = await params
  const label = slugToLabel(decodeURIComponent(category))
  return {
    title: `South African ${label} Businesses Worldwide`,
    description: `Browse South African ${label} businesses and shops around the world. Find SA products and services in your country.`,
  }
}

export default async function CategoryPage({ params, searchParams }: Props) {
  const { category } = await params
  const { country, online, sort } = await searchParams
  const label = slugToLabel(decodeURIComponent(category))
  const supabase = await createServerSupabaseClient()

  const isOnlineStores = label === 'Online Stores'

  // Fetch all matching listings
  let listings: Listing[] = []

  if (isOnlineStores) {
    const [{ data: byCat }, { data: byFlag }] = await Promise.all([
      supabase.from('listings').select('*').eq('status', 'active').eq('category', label),
      supabase.from('listings').select('*').eq('status', 'active').eq('sells_online', true),
    ])
    const seen = new Set<string>()
    for (const item of [...(byCat ?? []), ...(byFlag ?? [])] as Listing[]) {
      if (!seen.has(item.id)) { seen.add(item.id); listings.push(item) }
    }
  } else {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .eq('category', label)
    listings = (data ?? []) as Listing[]
  }

  // Count online listings before filtering (for the button label)
  const onlineCount = listings.filter(l => l.sells_online).length

  // Apply filters
  if (country) listings = listings.filter(l => l.country === country)
  if (online === '1') listings = listings.filter(l => l.sells_online)

  // Apply sort
  if (sort === 'za') {
    listings.sort((a, b) => b.business_name.localeCompare(a.business_name))
  } else if (sort === 'newest') {
    listings.sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime())
  } else {
    listings.sort((a, b) => a.business_name.localeCompare(b.business_name))
  }

  const activeFilters = [country, online === '1' ? 'online' : ''].filter(Boolean)

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-1">{label}</h1>
      <p className="text-gray-500 mb-6">
        {listings.length} {activeFilters.length > 0 ? 'matching' : 'South African'}{' '}
        {label.toLowerCase()} {listings.length === 1 ? 'business' : 'businesses'}
        {activeFilters.length === 0 ? ' listed worldwide' : ''}
      </p>

      <Suspense fallback={null}>
        <CategoryFilters onlineCount={onlineCount} />
      </Suspense>

      {listings.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">No listings match your filters.</p>
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
