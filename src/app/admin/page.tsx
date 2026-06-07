import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import AdminDashboard from './AdminDashboard'
import type { Listing, Event, ListingClaim } from '@/lib/types'

export const metadata = { title: 'Admin — SafferBiz' }

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: listingsData }, { data: eventsData }, { data: claimsData }] = await Promise.all([
    admin.from('listings').select('*').order('created_at', { ascending: false }),
    admin.from('events').select('*').order('event_date', { ascending: true }),
    admin
      .from('listing_claims')
      .select('*, listing:listings(business_name, slug)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const listings = (listingsData ?? []) as Listing[]
  const events = (eventsData ?? []) as Event[]
  const claims = ((claimsData ?? []) as Array<ListingClaim & { listing: { business_name: string; slug: string } | null }>)
    .map((c) => ({
      ...c,
      business_name: c.listing?.business_name,
      slug: c.listing?.slug,
    })) as ListingClaim[]

  return <AdminDashboard listings={listings} events={events} claims={claims} />
}
