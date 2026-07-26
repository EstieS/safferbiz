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

const YEAR_COLORS = ['#7B1E3A', '#9C6B4E', '#4A6D7C', '#6B5B73', '#7A6A2E']
const YEAR_ROW_BG = ['#FDF2F5', '#F7F1EC', '#EFF4F6', '#F3F1F5', '#F7F5EC']

function extractYear(monthLabel: string): string {
  return monthLabel.match(/\d{4}/)?.[0] ?? ''
}

const MONTH_ABBR: Record<string, string> = {
  January: 'Jan', February: 'Feb', March: 'Mar', April: 'Apr', May: 'May', June: 'Jun',
  July: 'Jul', August: 'Aug', September: 'Sep', October: 'Oct', November: 'Nov', December: 'Dec',
}

function abbreviateMonth(monthLabel: string): string {
  const [month, year] = monthLabel.split(' ')
  return year ? `${MONTH_ABBR[month] ?? month} ${year}` : monthLabel
}

function uniqueYearsDesc(books: Book[]): string[] {
  return Array.from(new Set(books.map((b) => extractYear(b.month_label)))).sort((a, b) => b.localeCompare(a))
}

function yearIndex(years: string[], monthLabel: string): number {
  return years.indexOf(extractYear(monthLabel))
}

function yearColor(years: string[], monthLabel: string): string {
  return YEAR_COLORS[yearIndex(years, monthLabel) % YEAR_COLORS.length] ?? WINE
}

function yearRowBg(years: string[], monthLabel: string): string {
  return YEAR_ROW_BG[yearIndex(years, monthLabel) % YEAR_ROW_BG.length] ?? '#FFFFFF'
}

// Bands alternate rows within each year's own run, like Excel banded rows --
// counts reset whenever the year changes so each year's stripes start fresh.
function computeRowBanding(books: Book[]): boolean[] {
  const counts: Record<string, number> = {}
  return books.map((b) => {
    const year = extractYear(b.month_label)
    const n = counts[year] ?? 0
    counts[year] = n + 1
    return n % 2 === 1
  })
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
  const years = uniqueYearsDesc(books)
  const rowBanding = computeRowBanding(books)
  const [showAddBook, setShowAddBook] = useState(false)
  const [expandedBookId, setExpandedBookId] = useState<string | null>(null)
  const [editingBookId, setEditingBookId] = useState<string | null>(null)
  const [draftScore, setDraftScore] = useState('')
  const [draftComment, setDraftComment] = useState('')
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
  const [commentsModalBookId, setCommentsModalBookId] = useState<string | null>(null)
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set())

  function toggleYear(year: string) {
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

  const [collapsedBookYears, setCollapsedBookYears] = useState<Set<string>>(new Set())

  function toggleBookYear(year: string) {
    setCollapsedBookYears((prev) => {
      const next = new Set(prev)
      if (next.has(year)) {
        next.delete(year)
      } else {
        next.add(year)
      }
      return next
    })
  }

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

  function startEditingBook(book: Book) {
    const myScore = book.scores?.find((s) => s.club_member_id === currentMember.id)
    const myComment = book.comments?.find((c) => c.club_member_id === currentMember.id)
    setDraftScore(myScore ? String(myScore.score) : '')
    setDraftComment(myComment?.comment ?? '')
    setEditingBookId(book.id)
  }

  function cancelEditingBook() {
    setEditingBookId(null)
  }

  async function handleSaveBook(bookId: string) {
    setSaving(bookId)
    setErrorMsg('')
    const supabase = createClient()

    const scoreValue = Number(draftScore)
    if (draftScore.trim() && !Number.isNaN(scoreValue)) {
      const { error } = await supabase
        .from('book_scores')
        .upsert(
          { book_id: bookId, club_member_id: currentMember.id, score: scoreValue },
          { onConflict: 'book_id,club_member_id' }
        )
      if (error) {
        setSaving(null)
        setErrorMsg(error.message)
        return
      }
    }

    const trimmedComment = draftComment.trim()
    if (trimmedComment) {
      const { error } = await supabase
        .from('book_comments')
        .upsert(
          { book_id: bookId, club_member_id: currentMember.id, comment: trimmedComment },
          { onConflict: 'book_id,club_member_id' }
        )
      if (error) {
        setSaving(null)
        setErrorMsg(error.message)
        return
      }
    } else {
      const { error } = await supabase
        .from('book_comments')
        .delete()
        .eq('book_id', bookId)
        .eq('club_member_id', currentMember.id)
      if (error) {
        setSaving(null)
        setErrorMsg(error.message)
        return
      }
    }

    setSaving(null)
    setEditingBookId(null)
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
      <div className="max-w-4xl mx-auto px-4 py-10">
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
          <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide mb-3">
            Overview
          </h2>
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left text-gray-400 text-xs uppercase">
                <th className="pb-2 pr-3 font-medium">Month</th>
                <th className="pb-2 pr-3 font-medium min-w-[160px]">Book</th>
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
                <th className="pb-2 pl-3 font-medium text-left">Comments</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                const rows: React.ReactNode[] = []
                const colCount = members.length + 4
                let lastYear: string | null = null

                books.forEach((book, i) => {
                  const year = extractYear(book.month_label)

                  if (year !== lastYear) {
                    lastYear = year
                    const collapsed = collapsedYears.has(year)
                    const count = books.filter((b) => extractYear(b.month_label) === year).length
                    rows.push(
                      <tr key={`year-${year}`} className="border-t border-gray-200">
                        <td colSpan={colCount} className="py-2">
                          <button
                            type="button"
                            onClick={() => toggleYear(year)}
                            className="flex items-center gap-2 text-base font-extrabold"
                            style={{ color: yearColor(years, book.month_label) }}
                          >
                            <span>{collapsed ? '▶' : '▼'}</span>
                            {year} ({count})
                          </button>
                        </td>
                      </tr>
                    )
                  }

                  if (collapsedYears.has(year)) return

                  const avg = average(book)
                  rows.push(
                    <tr
                      key={book.id}
                      className="border-t border-gray-100"
                      style={{ backgroundColor: rowBanding[i] ? yearRowBg(years, book.month_label) : '#FFFFFF' }}
                    >
                      <td className="py-2 pr-3 font-bold whitespace-nowrap" style={{ color: yearColor(years, book.month_label) }}>
                        {abbreviateMonth(book.month_label)}
                      </td>
                      <td className="py-2 pr-3 font-medium text-gray-900 text-[13px] leading-snug min-w-[160px]">
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
                      <td className="py-2 pl-3 text-xs">
                        {book.comments && book.comments.length > 0 ? (
                          <button
                            type="button"
                            onClick={() => setCommentsModalBookId(book.id)}
                            className="font-medium hover:underline whitespace-nowrap"
                            style={{ color: WINE }}
                          >
                            💬 {book.comments.length} comment{book.comments.length === 1 ? '' : 's'}
                          </button>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })

                return rows
              })()}
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

      {books.length > 0 && (
        <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide mt-8 mb-3">My Ratings</h2>
      )}

      <div className="space-y-3">
        {books.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-10">No books yet — add your first pick above.</p>
        )}

        {(() => {
          const nodes: React.ReactNode[] = []
          let lastYear: string | null = null

          books.forEach((book) => {
            const year = extractYear(book.month_label)

            if (year !== lastYear) {
              lastYear = year
              const collapsed = collapsedBookYears.has(year)
              const count = books.filter((b) => extractYear(b.month_label) === year).length
              nodes.push(
                <button
                  key={`book-year-${year}`}
                  type="button"
                  onClick={() => toggleBookYear(year)}
                  className="flex items-center gap-2 text-sm font-bold pt-2"
                  style={{ color: yearColor(years, book.month_label) }}
                >
                  <span>{collapsed ? '▶' : '▼'}</span>
                  {year} ({count})
                </button>
              )
            }

            if (collapsedBookYears.has(year)) return

            const myScore = book.scores?.find((s) => s.club_member_id === currentMember.id)
            const myComment = book.comments?.find((c) => c.club_member_id === currentMember.id)
            const avg = average(book)
            const expanded = expandedBookId === book.id

            nodes.push(
              <div key={book.id} className="bg-white rounded-2xl border border-rose-100 p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold uppercase tracking-wide" style={{ color: yearColor(years, book.month_label) }}>
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

                {editingBookId === book.id ? (
                  <>
                    <div className="mt-4 flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-500 shrink-0">Your score</label>
                      <input
                        type="number"
                        min={0}
                        max={10}
                        step={0.5}
                        value={draftScore}
                        onChange={(e) => setDraftScore(e.target.value)}
                        className="w-20 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="text-xs font-medium text-gray-500 shrink-0">Your comment</label>
                      <input
                        type="text"
                        value={draftComment}
                        onChange={(e) => setDraftComment(e.target.value)}
                        placeholder="Optional thoughts..."
                        className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                      />
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => handleSaveBook(book.id)}
                        disabled={saving === book.id}
                        className="px-4 py-1.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
                        style={{ backgroundColor: WINE }}
                      >
                        {saving === book.id ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={cancelEditingBook}
                        className="px-4 py-1.5 rounded-lg text-gray-600 text-sm hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setExpandedBookId(expanded ? null : book.id)}
                        className="text-xs text-gray-500 hover:text-[#7B1E3A] ml-auto"
                      >
                        {expanded ? 'Hide scores' : 'See everyone\'s scores'}
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    <p className="text-sm text-gray-600">
                      Your score: <span className="font-semibold">{myScore ? Number(myScore.score).toFixed(1) : '—'}</span>
                    </p>
                    {myComment && (
                      <p className="text-sm text-gray-500 italic">&ldquo;{myComment.comment}&rdquo;</p>
                    )}
                    <button
                      onClick={() => startEditingBook(book)}
                      className="text-xs font-medium hover:underline"
                      style={{ color: WINE }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setExpandedBookId(expanded ? null : book.id)}
                      className="text-xs text-gray-500 hover:text-[#7B1E3A] ml-auto"
                    >
                      {expanded ? 'Hide scores' : 'See everyone\'s scores'}
                    </button>
                  </div>
                )}

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
          })

          return nodes
        })()}
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

      {commentsModalBookId && (() => {
        const modalBook = books.find((b) => b.id === commentsModalBookId)
        if (!modalBook) return null
        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onClick={() => setCommentsModalBookId(null)}
          >
            <div
              className="bg-white rounded-2xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: yearColor(years, modalBook.month_label) }}>
                    {modalBook.month_label}
                  </p>
                  <h3 className="font-semibold text-gray-900">{modalBook.title}</h3>
                </div>
                <button
                  onClick={() => setCommentsModalBookId(null)}
                  className="text-gray-400 hover:text-gray-600 text-xl leading-none shrink-0"
                >
                  ×
                </button>
              </div>
              <div className="space-y-3">
                {modalBook.comments?.map((c) => (
                  <div key={c.id}>
                    <p className="text-sm font-semibold" style={{ color: memberColor(members, c.club_member_id) }}>
                      {memberName(members, c.club_member_id)}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">{c.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
