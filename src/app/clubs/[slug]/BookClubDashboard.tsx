'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dancing_Script } from 'next/font/google'
import { createClient } from '@/lib/supabase'
import type { Club, ClubMember, Book, ClubMeeting } from '@/lib/types'

function firstName(name: string): string {
  return name.split(' ')[0]
}

const script = Dancing_Script({ subsets: ['latin'], weight: '700' })

const WINE = '#7B1E3A'

const MEMBER_COLORS = ['#B5495B', '#2E6F6E', '#B8860B', '#5B4B8A', '#3B6E42', '#A8456B', '#3E6B8A', '#8A5B2E']

function memberColor(members: ClubMember[], clubMemberId: string): string {
  const idx = members.findIndex((m) => m.id === clubMemberId)
  return MEMBER_COLORS[idx % MEMBER_COLORS.length] ?? '#374151'
}

interface Props {
  club: Club
  members: ClubMember[]
  books: Book[]
  currentMember: ClubMember
  nextMeeting: ClubMeeting | null
  pastMeetings: ClubMeeting[]
}

function average(book: Book): number | null {
  if (!book.scores || book.scores.length === 0) return null
  const total = book.scores.reduce((sum, s) => sum + Number(s.score), 0)
  return total / book.scores.length
}

function memberName(members: ClubMember[], clubMemberId: string): string {
  return members.find((m) => m.id === clubMemberId)?.display_name ?? 'Unknown'
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatMeetingDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export default function BookClubDashboard({ club, members, books, currentMember, nextMeeting, pastMeetings }: Props) {
  const router = useRouter()
  const [showAddBook, setShowAddBook] = useState(false)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState('')

  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [monthLabel, setMonthLabel] = useState('')
  const [pickedBy, setPickedBy] = useState('')
  const [purchaseLink, setPurchaseLink] = useState('')

  const [editingMeeting, setEditingMeeting] = useState(false)
  const [meetingAt, setMeetingAt] = useState('')
  const [meetingZoomLink, setMeetingZoomLink] = useState('')
  const [meetingBookId, setMeetingBookId] = useState('')
  const [showHistory, setShowHistory] = useState(false)

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
      purchase_link: purchaseLink.trim() || null,
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
    setPurchaseLink('')
    setShowAddBook(false)
    router.refresh()
  }

  function openMeetingForm() {
    setMeetingAt(nextMeeting ? toLocalInputValue(nextMeeting.meeting_at) : '')
    setMeetingZoomLink(nextMeeting?.zoom_link ?? '')
    setMeetingBookId(nextMeeting?.book_id ?? books[0]?.id ?? '')
    setEditingMeeting(true)
  }

  async function handleSaveMeeting(e: React.FormEvent) {
    e.preventDefault()
    if (!meetingAt) return

    setSaving('meeting')
    setErrorMsg('')
    const supabase = createClient()

    const payload = {
      club_id: club.id,
      book_id: meetingBookId || null,
      meeting_at: new Date(meetingAt).toISOString(),
      zoom_link: meetingZoomLink.trim() || null,
    }

    const { error } = nextMeeting
      ? await supabase.from('club_meetings').update(payload).eq('id', nextMeeting.id)
      : await supabase.from('club_meetings').insert(payload)

    setSaving(null)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setEditingMeeting(false)
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

  async function handleCommentChange(bookId: string, comment: string) {
    const trimmed = comment.trim()

    setSaving(`comment-${bookId}`)
    setErrorMsg('')
    const supabase = createClient()

    if (!trimmed) {
      const { error } = await supabase
        .from('book_comments')
        .delete()
        .eq('book_id', bookId)
        .eq('club_member_id', currentMember.id)

      setSaving(null)
      if (error) {
        setErrorMsg(error.message)
        return
      }
      router.refresh()
      return
    }

    const { error } = await supabase
      .from('book_comments')
      .upsert(
        { book_id: bookId, club_member_id: currentMember.id, comment: trimmed },
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
            Signed in as{' '}
            <strong style={{ color: memberColor(members, currentMember.id) }}>
              {currentMember.display_name}
            </strong>{' '}
            · {members.length} member{members.length === 1 ? '' : 's'}
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

      <div className="mt-6 rounded-2xl border-2 p-5" style={{ borderColor: WINE, backgroundColor: '#FDF2F5' }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-2" style={{ color: WINE }}>
          📅 Next Meeting
        </h2>

        {editingMeeting ? (
          <form onSubmit={handleSaveMeeting} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date &amp; time</label>
                <input
                  type="datetime-local"
                  required
                  value={meetingAt}
                  onChange={(e) => setMeetingAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Book</label>
                <select
                  value={meetingBookId}
                  onChange={(e) => setMeetingBookId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                >
                  <option value="">No book selected</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.month_label} — {b.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Zoom link</label>
              <input
                type="url"
                value={meetingZoomLink}
                onChange={(e) => setMeetingZoomLink(e.target.value)}
                placeholder="https://zoom.us/j/..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving === 'meeting'}
                className="px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                style={{ backgroundColor: WINE }}
              >
                {saving === 'meeting' ? 'Saving...' : 'Save'}
              </button>
              <button
                type="button"
                onClick={() => setEditingMeeting(false)}
                className="px-4 py-2 rounded-lg text-gray-600 text-sm hover:bg-white"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : nextMeeting ? (
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <p className="text-lg font-semibold text-gray-900">{formatMeetingDate(nextMeeting.meeting_at)}</p>
              {nextMeeting.book_id && (
                <p className="text-sm text-gray-600 mt-0.5">
                  {books.find((b) => b.id === nextMeeting.book_id)?.title ?? ''}
                </p>
              )}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {nextMeeting.zoom_link && (
                <a
                  href={nextMeeting.zoom_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 rounded-lg text-white font-medium text-sm"
                  style={{ backgroundColor: WINE }}
                >
                  Join Zoom ↗
                </a>
              )}
              <button onClick={openMeetingForm} className="text-xs text-gray-500 hover:text-[#7B1E3A]">
                Edit
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">No meeting scheduled yet.</p>
            <button
              onClick={openMeetingForm}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: WINE }}
            >
              + Schedule
            </button>
          </div>
        )}
      </div>

      {books.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-rose-100 p-4 overflow-x-auto">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
            Overview
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase">
                <th className="pb-2 pr-3 font-medium">Month</th>
                <th className="pb-2 pr-3 font-medium">Book</th>
                {members.map((m) => (
                  <th
                    key={m.id}
                    className="pb-2 px-2 font-bold text-center whitespace-nowrap"
                    style={{ color: memberColor(members, m.id) }}
                  >
                    {firstName(m.display_name)}
                  </th>
                ))}
                <th className="pb-2 pl-2 font-medium text-center">Avg</th>
              </tr>
            </thead>
            <tbody>
              {books.map((book) => {
                const avg = average(book)
                return (
                  <tr key={book.id} className="border-t border-gray-100">
                    <td className="py-2 pr-3 font-bold whitespace-nowrap" style={{ color: WINE }}>
                      {book.month_label}
                    </td>
                    <td className="py-2 pr-3 font-medium text-gray-900">
                      {book.purchase_link ? (
                        <a
                          href={book.purchase_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {book.title}
                        </a>
                      ) : (
                        book.title
                      )}
                    </td>
                    {members.map((m) => {
                      const s = book.scores?.find((sc) => sc.club_member_id === m.id)
                      return (
                        <td
                          key={m.id}
                          className="py-2 px-2 text-center font-medium"
                          style={{ color: memberColor(members, m.id) }}
                        >
                          {s ? Number(s.score).toFixed(1) : '—'}
                        </td>
                      )
                    })}
                    <td className="py-2 pl-2 text-center font-semibold" style={{ color: WINE }}>
                      {avg !== null ? avg.toFixed(1) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

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
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Amazon link</label>
              <input
                type="url"
                value={purchaseLink}
                onChange={(e) => setPurchaseLink(e.target.value)}
                placeholder="https://amazon.com/..."
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
          const myComment = book.comments?.find((c) => c.club_member_id === currentMember.id)
          const avg = average(book)
          const expanded = expandedBookId === book.id

          return (
            <div key={book.id} className="bg-white rounded-2xl border border-rose-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wide" style={{ color: WINE }}>
                    {book.month_label}
                  </p>
                  <h2 className="font-semibold text-gray-900">{book.title}</h2>
                  {book.author && <p className="text-sm text-gray-500">{book.author}</p>}
                  {book.picked_by && (
                    <p className="text-xs text-gray-400 mt-1">Picked by {book.picked_by}</p>
                  )}
                  {book.purchase_link && (
                    <a
                      href={book.purchase_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs hover:underline"
                      style={{ color: WINE }}
                    >
                      View on Amazon ↗
                    </a>
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
                <label className="text-xs font-medium text-gray-500 shrink-0">Your score</label>
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

              <div className="mt-2 flex items-center gap-3">
                <label className="text-xs font-medium text-gray-500 shrink-0">Your comment</label>
                <input
                  type="text"
                  defaultValue={myComment?.comment ?? ''}
                  onBlur={(e) => handleCommentChange(book.id, e.target.value)}
                  disabled={saving === `comment-${book.id}`}
                  placeholder="Optional thoughts..."
                  className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                />
              </div>

              {expanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {members.map((m) => {
                    const s = book.scores?.find((sc) => sc.club_member_id === m.id)
                    const c = book.comments?.find((cm) => cm.club_member_id === m.id)
                    const color = memberColor(members, m.id)
                    return (
                      <div key={m.id} className="text-sm">
                        <div className="flex justify-between">
                          <span className="font-semibold" style={{ color }}>{memberName(members, m.id)}</span>
                          <span className="font-medium" style={{ color }}>{s ? Number(s.score).toFixed(1) : '—'}</span>
                        </div>
                        {c && <p className="text-xs text-gray-500 italic mt-0.5">&ldquo;{c.comment}&rdquo;</p>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {pastMeetings.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="text-xs text-gray-500 hover:text-[#7B1E3A]"
          >
            {showHistory ? 'Hide' : 'Show'} meeting history ({pastMeetings.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1">
              {pastMeetings.map((m) => (
                <li key={m.id} className="text-sm text-gray-500">
                  {formatMeetingDate(m.meeting_at)}
                  {m.book_id && (
                    <span className="text-gray-400"> — {books.find((b) => b.id === m.book_id)?.title ?? ''}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
