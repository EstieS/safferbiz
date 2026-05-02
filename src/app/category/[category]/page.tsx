import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import { CATEGORIES } from '@/lib/constants'
import type { Listing } from '@/lib/types'

interface Props {
  params: Promise<{ category: string }>
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

export default async function CategoryPage({ params }: Props) {
  const { category } = await params
  const label = slugToLabel(decodeURIComponent(category))
  const supabase = await createServerSupabaseClient()

  const isOnlineStores = label === 'Online Stores'

  let listings: Listing[] = []

  if (isOnlineStores) {
    // Fetch both: businesses in the Online Stores category AND any with sells_online flag
    const [{ data: byCat }, { data: byFlag }] = await Promise.all([
      supabase.from('listings').select('*').eq('status', 'active').eq('category', label),
      supabase.from('listings').select('*').eq('status', 'active').eq('sells_online', true),
    ])
    const seen = new Set<string>()
    for (const item of [...(byCat ?? []), ...(byFlag ?? [])] as Listing[]) {
      if (!seen.has(item.id)) { seen.add(item.id); listings.push(item) }
    }
    listings.sort((a, b) => a.business_name.localeCompare(b.business_name))
  } else {
    const { data } = await supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .eq('category', label)
      .order('business_name')
    listings = (data ?? []) as Listing[]
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{label}</h1>
      <p className="text-gray-500 mb-8">
        {listings.length} South African {label.toLowerCase()} {listings.length === 1 ? 'business' : 'businesses'} listed worldwide
      </p>

      {listings.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">No listings in this category yet.</p>
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
