import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import AdminDashboard from './AdminDashboard'
import type { Listing, Event } from '@/lib/types'

export const metadata = { title: 'Admin — SafferBiz' }

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const [{ data: listingsData }, { data: eventsData }] = await Promise.all([
    admin.from('listings').select('*').order('created_at', { ascending: false }),
    admin.from('events').select('*').order('event_date', { ascending: true }),
  ])

  const listings = (listingsData ?? []) as Listing[]
  const events = (eventsData ?? []) as Event[]

  return <AdminDashboard listings={listings} events={events} />
}
