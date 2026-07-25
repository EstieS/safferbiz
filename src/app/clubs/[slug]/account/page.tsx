import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ChangePasswordForm from './ChangePasswordForm'

interface Props {
  params: Promise<{ slug: string }>
}

export const metadata = { title: 'Account — Book Club' }

export default async function ClubAccountPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/clubs/${slug}/login`)

  return <ChangePasswordForm slug={slug} />
}
