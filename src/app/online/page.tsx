import type { Metadata } from 'next'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ListingCard from '@/components/ListingCard'
import type { Listing } from '@/lib/types'

export const metadata: Metadata = {
  title: 'Online Stores | SafferBiz',
  description: 'Browse South African businesses that accept online orders and deliver to you.',
}

export default async function OnlinePage() {
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('status', 'active')
    .eq('sells_online', true)
    .order('business_name')

  const listings = (data ?? []) as Listing[]

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">🛒 Online Stores</h1>
        <p className="text-gray-500">
          SA businesses that accept online orders — shop from anywhere in the world.
        </p>
      </div>

      {listings.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No online stores listed yet.</p>
          <p className="text-sm mt-2">Do you sell online? <a href="/submit" className="text-green-600 underline">List your business</a></p>
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-500 mb-6">{listings.length} {listings.length === 1 ? 'business' : 'businesses'} found</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
