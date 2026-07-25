import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'
import type { Club, ClubMember, Book, BookScore } from '@/lib/types'
import BookClubDashboard from './BookClubDashboard'

interface Props {
  params: Promise<{ slug: string }>
}

function ErrorState({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <div className="text-5xl mb-4">📚</div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-600 text-sm">{body}</p>
      <Link href="/" className="inline-block mt-6 text-sm text-green-700 hover:underline">← Back to SafferBiz</Link>
    </div>
  )
}

export default async function ClubPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect(`/clubs/${slug}/login`)

  const admin = createAdminClient()

  const { data: club } = await admin
    .from('clubs')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!club) {
    return <ErrorState title="Club not found" body="We couldn't find a book club at this address." />
  }

  const { data: me } = await admin
    .from('club_members')
    .select('*')
    .eq('club_id', club.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!me) {
    return (
      <ErrorState
        title="Not a member"
        body={`Your account isn't a member of ${(club as Club).name}. Ask the club organizer to add you.`}
      />
    )
  }

  const [{ data: membersData }, { data: booksData }, { data: scoresData }] = await Promise.all([
    admin.from('club_members').select('*').eq('club_id', club.id).order('created_at', { ascending: true }),
    admin.from('books').select('*').eq('club_id', club.id).order('created_at', { ascending: false }),
    admin
      .from('book_scores')
      .select('*, books!inner(club_id)')
      .eq('books.club_id', club.id),
  ])

  const members = (membersData ?? []) as ClubMember[]
  const scores = (scoresData ?? []) as BookScore[]
  const books = ((booksData ?? []) as Book[]).map((book) => ({
    ...book,
    scores: scores.filter((s) => s.book_id === book.id),
  }))

  return (
    <BookClubDashboard
      club={club as Club}
      members={members}
      books={books}
      currentMember={me as ClubMember}
    />
  )
}
