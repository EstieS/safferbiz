import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import type { FitGroup, FitMember } from '@/lib/fitness'
import { loadFitData } from '@/lib/fitnessData'
import FitnessDashboard from './FitnessDashboard'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata = {
  title: 'Fitness tracker',
  robots: { index: false, follow: false },
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">🏋️‍♀️</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-sm">{body}</p>
      <Link href="/" className="inline-block mt-6 text-sm text-green-700 hover:underline">← Back to SafferBiz</Link>
    </div>
  )
}

export default async function FitPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/fit/${slug}/login`)

  const admin = createAdminClient()

  const { data: group } = await admin
    .from('fit_groups')
    .select('id, slug, name')
    .eq('slug', slug)
    .single()

  if (!group) {
    return <ErrorState title="Not found" body="We couldn't find a fitness group at this address." />
  }

  const { data: me } = await admin
    .from('fit_members')
    .select('*')
    .eq('group_id', group.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!me) {
    return (
      <ErrorState
        title="Not a member"
        body={`Your account isn't part of ${(group as FitGroup).name}. Ask the organizer to add you.`}
      />
    )
  }

  const data = await loadFitData(admin, group.id)

  return <FitnessDashboard group={group as FitGroup} currentMember={me as FitMember} initialData={data} />
}
