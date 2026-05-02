import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import { COUNTRIES } from '@/lib/constants'
import type { Listing } from '@/lib/types'

interface Props {
  params: Promise<{ country: string }>
}

function slugToLabel(slug: string): string {
  return COUNTRIES.find(
    (c) => c.toLowerCase().replace(/ /g, '-') === slug
  ) ?? slug
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { country } = await params
  const label = slugToLabel(decodeURIComponent(country))
  return {
    title: `South African Businesses in ${label}`,
    description: `Find South African businesses, shops, and online stores in ${label}. The SA expat directory for ${label}.`,
  }
}

export default async function CountryPage({ params }: Props) {
  const { country } = await params
  const label = slugToLabel(decodeURIComponent(country))
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('country', label)
    .order('business_name')

  const listings = (data ?? []) as Listing[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">
        South African Businesses in {label}
      </h1>
      <p className="text-gray-500 mb-8">
        {listings.length} {listings.length === 1 ? 'business' : 'businesses'} listed in {label}
      </p>

      {listings.length === 0 ? (
        <p className="text-gray-400 py-12 text-center">No listings in {label} yet.</p>
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
