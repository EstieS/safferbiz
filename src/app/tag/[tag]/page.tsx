import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import type { Listing } from '@/lib/types'

interface Props {
  params: Promise<{ tag: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params
  const label = decodeURIComponent(tag)
  return {
    title: `South African Businesses selling ${label} Worldwide`,
    description: `Find South African businesses and shops that sell ${label} around the world. The SA expat directory for ${label}.`,
  }
}

export default async function TagPage({ params }: Props) {
  const { tag } = await params
  const label = decodeURIComponent(tag)
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .contains('tags', [label])
    .order('business_name')

  const listings = (data ?? []) as Listing[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <p className="text-sm text-gray-500 mb-1">Product Search</p>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Businesses selling <span style={{ color: '#007A4D' }}>{label}</span>
        </h1>
        <p className="text-gray-500">
          {listings.length} {listings.length === 1 ? 'business' : 'businesses'} found worldwide
        </p>
      </div>

      {listings.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">
          No businesses tagged with &ldquo;{label}&rdquo; yet.
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
