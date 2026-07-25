'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dancing_Script } from 'next/font/google'
import { createClient } from '@/lib/supabase'
import type { Club, ClubMember, Book } from '@/lib/types'

const script = Dancing_Script({ subsets: ['latin'], weight: '700' })

const WINE = '#7B1E3A'

interface Props {
  club: Club
  members: ClubMember[]
  books: Book[]
  currentMember: ClubMember
}

function average(book: Book): number | null {
  if (!book.scores || book.scores.length === 0) return null
  const total = book.scores.reduce((sum, s) => sum + Number(s.score), 0)
  return total / book.scores.length
}

function memberName(members: ClubMember[], clubMemberId: string): string {
  return members.find((m) => m.id === clubMemberId)?.display_name ?? 'Unknown'
}

export default function BookClubDashboard({ club, members, books, currentMember }: Props) {
  const router = useRouter()
  const [showAddBook, setShowAddBook] = useState(false)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [monthLabel, setMonthLabel] = useState('')
  const [pickedBy, setPickedBy] = useState('')

  async function handleAddBook(e: React.FormEvent) {
    e.preventDefault()
    setSaving('new-book')
    setErrorMsg('')
    const supabase = createClient()

    const { error } = await supabase.from('books').insert({
      club_id: club.id,
      title: title.trim(),
      author: author.trim() || null,
      month_label: monthLabel.trim(),
      picked_by: pickedBy.trim() || null,
      added_by: currentMember.id,
    })

    setSaving(null)
    if (error) {
      setErrorMsg(error.message)
      return
    }

    setTitle('')
    setAuthor('')
    setMonthLabel('')
    setPickedBy('')
    setShowAddBook(false)
    router.refresh()
  }

  async function handleScoreChange(bookId: string, score: string) {
    const value = Number(score)
    if (!score || Number.isNaN(value)) return

    setSaving(bookId)
    setErrorMsg('')
    const supabase = createClient()

    const { error } = await supabase
      .from('book_scores')
      .upsert(
        { book_id: bookId, club_member_id: currentMember.id, score: value },
        { onConflict: 'book_id,club_member_id' }
      )

    setSaving(null)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    router.refresh()
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push(`/clubs/${club.slug}/login`)
    router.refresh()
  }

  return (
    <div className="bg-gradient-to-b from-rose-50 via-white to-amber-50">
      <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h1 className={`${script.className} text-4xl`} style={{ color: WINE }}>
            🍷 {club.name} 📚
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Signed in as <strong>{currentMember.display_name}</strong> ·{' '}
            {members.length} member{members.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <Link href={`/clubs/${club.slug}/account`} className="text-sm text-gray-500 hover:text-[#7B1E3A]">
            Change password
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-[#7B1E3A]">
            Log out
          </button>
        </div>
      </div>

      {errorMsg && <p className="text-sm text-red-600 mt-3">{errorMsg}</p>}

      <div className="mt-6 mb-4">
        {!showAddBook ? (
          <button
            onClick={() => setShowAddBook(true)}
            className="px-4 py-2 rounded-lg text-white font-medium text-sm"
            style={{ backgroundColor: WINE }}
          >
            + Add a book
          </button>
        ) : (
          <form onSubmit={handleAddBook} className="bg-white rounded-2xl border border-rose-100 p-6 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Month</label>
                <input
                  required
                  value={monthLabel}
                  onChange={(e) => setMonthLabel(e.target.value)}
                  placeholder="July 2026"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Picked by</label>
                <input
                  value={pickedBy}
                  onChange={(e) => setPickedBy(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Author</label>
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="submit"
                disabled={saving === 'new-book'}
                className="px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                style={{ backgroundColor: WINE }}
              >
                {saving === 'new-book' ? 'Saving...' : 'Save book'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddBook(false)}
                className="px-4 py-2 rounded-lg text-gray-600 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="space-y-3">
        {books.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-10">No books yet — add your first pick above.</p>
        )}

        {books.map((book) => {
          const myScore = book.scores?.find((s) => s.club_member_id === currentMember.id)
          const avg = average(book)
          const expanded = expandedBookId === book.id

          return (
            <div key={book.id} className="bg-white rounded-2xl border border-rose-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-gray-400">{book.month_label}</p>
                  <h2 className="font-semibold text-gray-900">{book.title}</h2>
                  {book.author && <p className="text-sm text-gray-500">{book.author}</p>}
                  {book.picked_by && (
                    <p className="text-xs text-gray-400 mt-1">Picked by {book.picked_by}</p>
                  )}
                </div>
                <div className="text-right shrink-0">
                  <p className="text-2xl font-bold" style={{ color: WINE }}>
                    {avg !== null ? avg.toFixed(1) : '—'}
                  </p>
                  <p className="text-xs text-gray-400">
                    {book.scores?.length ?? 0}/{members.length} scored
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3">
                <label className="text-xs font-medium text-gray-500">Your score</label>
                <input
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  defaultValue={myScore?.score ?? ''}
                  onBlur={(e) => handleScoreChange(book.id, e.target.value)}
                  disabled={saving === book.id}
                  className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                />
                <button
                  onClick={() => setExpandedBookId(expanded ? null : book.id)}
                  className="text-xs text-gray-500 hover:text-[#7B1E3A] ml-auto"
                >
                  {expanded ? 'Hide scores' : 'See everyone\'s scores'}
                </button>
              </div>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-y-1">
                  {members.map((m) => {
                    const s = book.scores?.find((sc) => sc.club_member_id === m.id)
                    return (
                      <div key={m.id} className="text-sm text-gray-600 flex justify-between pr-4">
                        <span>{memberName(members, m.id)}</span>
                        <span className="font-medium">{s ? Number(s.score).toFixed(1) : '—'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
      </div>
    </div>
  )
}
