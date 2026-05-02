import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import AdminDashboard from './AdminDashboard'
import type { Listing } from '@/lib/types'

export const metadata = { title: 'Admin — SafferBiz' }

export default async function AdminPage() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/admin/login')

  const admin = createAdminClient()
  const { data } = await admin
    .from('listings')
    .select('*')
    .order('created_at', { ascending: false })

  const listings = (data ?? []) as Listing[]

  return <AdminDashboard listings={listings} />
}
