import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ChangePasswordForm from '@/app/clubs/[slug]/account/ChangePasswordForm'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata = {
  title: 'Account - Fitness tracker',
  robots: { index: false, follow: false },
}

export default async function FitAccountPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/fit/${slug}/login`)

  return <ChangePasswordForm slug={slug} backHref={`/fit/${slug}`} backLabel="workouts" />
}
