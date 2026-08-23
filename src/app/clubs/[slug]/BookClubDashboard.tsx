'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Dancing_Script } from 'next/font/google'
import { createClient } from '@/lib/supabase'
import { getRandomQuote } from '@/lib/bookClubQuotes'
import type { Club, ClubMember, Book, ClubMeeting, ClubQuote } from '@/lib/types'

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
  quotes: ClubQuote[]
}

function average(book: Book): number | null {
  if (!book.scores || book.scores.length === 0) return null
  const total = book.scores.reduce((sum, s) => sum + Number(s.score), 0)
  return total / book.scores.length
}

function memberName(members: ClubMember[], clubMemberId: string): string {
  return members.find((m) => m.id === clubMemberId)?.display_name ?? 'Unknown'
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

function formatMeetingDateOnly(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

const MEETING_TIMEZONES = [
  { label: 'USA Eastern', zone: 'America/New_York' },
  { label: 'UK', zone: 'Europe/London' },
  { label: 'Netherlands', zone: 'Europe/Amsterdam' },
  { label: 'Germany', zone: 'Europe/Berlin' },
]

function formatZoneTime(iso: string, timeZone: string): string {
  return new Date(iso).toLocaleString('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
  })
}

// Converts a "YYYY-MM-DDTHH:mm" wall-clock string, understood to be in `timeZone`,
// into the correct UTC instant (handles each zone's DST offset at that date).
function zonedTimeToUtcIso(localDateTime: string, timeZone: string): string {
  const guess = new Date(`${localDateTime}:00Z`)
  const asTz = new Date(guess.toLocaleString('en-US', { timeZone }))
  const asUtc = new Date(guess.toLocaleString('en-US', { timeZone: 'UTC' }))
  const diff = asUtc.getTime() - asTz.getTime()
  return new Date(guess.getTime() + diff).toISOString()
}

// Inverse of the above: renders a UTC ISO instant as a "YYYY-MM-DDTHH:mm" wall-clock
// string for `timeZone`, suitable for a <input type="datetime-local"> value.
function utcToZonedInputValue(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(iso))
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00'
  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}

function currentMonthLabel(): string {
  const now = new Date()
  return `${now.toLocaleString('en-US', { month: 'long' })} ${now.getFullYear()}`
}

function BookLink({ book }: { book: Book | null | undefined }) {
  if (!book) return <p className="text-sm text-white/60">—</p>
  if (book.purchase_link) {
    return (
      <a
        href={book.purchase_link}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm font-medium text-white hover:underline"
      >
        {book.title} ↗
      </a>
    )
  }
  return <p className="text-sm font-medium text-white">{book.title}</p>
}

// Keyed by `${bookId}::${memberId}` from the caller so React remounts this
// (and re-derives the initial score/comment) whenever the selection changes,
// instead of syncing local state from props via an effect.
function AdminScoreFields({
  book,
  memberId,
  saving,
  onSave,
}: {
  book: Book
  memberId: string
  saving: boolean
  onSave: (score: string, comment: string) => void
}) {
  const existingScore = book.scores?.find((s) => s.club_member_id === memberId)
  const existingComment = book.comments?.find((c) => c.club_member_id === memberId)
  const [score, setScore] = useState(existingScore ? String(existingScore.score) : '')
  const [comment, setComment] = useState(existingComment?.comment ?? '')

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Score</label>
          <input
            type="number"
            min={0}
            max={10}
            step={0.5}
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Comment</label>
          <input
            type="text"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => onSave(score, comment)}
        disabled={saving}
        className="px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60"
        style={{ backgroundColor: WINE }}
      >
        {saving ? 'Saving...' : 'Save score'}
      </button>
    </>
  )
}

export default function BookClubDashboard({ club, members, books, currentMember, nextMeeting, pastMeetings, quotes }: Props) {
  const router = useRouter()
  const currentBook = books.find((b) => b.month_label.trim() === currentMonthLabel()) ?? null
  const nextBook = nextMeeting?.book_id ? books.find((b) => b.id === nextMeeting.book_id) ?? null : null
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
  const [meetingTimezone, setMeetingTimezone] = useState(MEETING_TIMEZONES[0].zone)
  const [meetingZoomLink, setMeetingZoomLink] = useState('')
  const [meetingBookId, setMeetingBookId] = useState('')
  const [activeTab, setActiveTab] = useState<'overview' | 'ratings' | 'admin'>('overview')
  const [showHistory, setShowHistory] = useState(false)
  const [commentsModalBookId, setCommentsModalBookId] = useState<string | null>(null)
  const [collapsedYears, setCollapsedYears] = useState<Set<string>>(new Set())
  const [welcomeQuote, setWelcomeQuote] = useState<string | null>(null)

  const [adminBookId, setAdminBookId] = useState('')
  const [adminMemberId, setAdminMemberId] = useState('')
  const [savingAdminScore, setSavingAdminScore] = useState(false)

  const [newQuoteText, setNewQuoteText] = useState('')
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null)
  const [quoteDraftText, setQuoteDraftText] = useState('')
  const [savingQuoteId, setSavingQuoteId] = useState<string | null>(null)

  const quotesRef = useRef(quotes)
  useEffect(() => {
    quotesRef.current = quotes
  }, [quotes])

  useEffect(() => {
    if (sessionStorage.getItem('showWelcomeQuote')) {
      sessionStorage.removeItem('showWelcomeQuote')
      const list = quotesRef.current
      const quote = list.length > 0 ? list[Math.floor(Math.random() * list.length)].quote : getRandomQuote()
      setWelcomeQuote(quote)
    }
  }, [])

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
    const zone = MEETING_TIMEZONES[0].zone
    setMeetingAt(nextMeeting ? utcToZonedInputValue(nextMeeting.meeting_at, zone) : '')
    setMeetingTimezone(zone)
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
      meeting_at: zonedTimeToUtcIso(meetingAt, meetingTimezone),
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

  async function saveScoreAndComment(
    bookId: string,
    memberId: string,
    scoreStr: string,
    commentStr: string
  ): Promise<string | null> {
    const supabase = createClient()

    const scoreValue = Number(scoreStr)
    if (scoreStr.trim() && !Number.isNaN(scoreValue)) {
      const { error } = await supabase
        .from('book_scores')
        .upsert(
          { book_id: bookId, club_member_id: memberId, score: scoreValue },
          { onConflict: 'book_id,club_member_id' }
        )
      if (error) return error.message
    }

    const trimmedComment = commentStr.trim()
    if (trimmedComment) {
      const { error } = await supabase
        .from('book_comments')
        .upsert(
          { book_id: bookId, club_member_id: memberId, comment: trimmedComment },
          { onConflict: 'book_id,club_member_id' }
        )
      if (error) return error.message
    } else {
      const { error } = await supabase
        .from('book_comments')
        .delete()
        .eq('book_id', bookId)
        .eq('club_member_id', memberId)
      if (error) return error.message
    }

    return null
  }

  async function handleSaveBook(bookId: string) {
    setSaving(bookId)
    setErrorMsg('')
    const error = await saveScoreAndComment(bookId, currentMember.id, draftScore, draftComment)
    setSaving(null)
    if (error) {
      setErrorMsg(error)
      return
    }
    setEditingBookId(null)
    router.refresh()
  }

  async function handleSaveAdminScore(bookId: string, memberId: string, scoreStr: string, commentStr: string) {
    setSavingAdminScore(true)
    setErrorMsg('')
    const error = await saveScoreAndComment(bookId, memberId, scoreStr, commentStr)
    setSavingAdminScore(false)
    if (error) {
      setErrorMsg(error)
      return
    }
    router.refresh()
  }

  async function handleAddQuote(e: React.FormEvent) {
    e.preventDefault()
    const text = newQuoteText.trim()
    if (!text) return
    setSavingQuoteId('new')
    setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('club_quotes').insert({ club_id: club.id, quote: text })
    setSavingQuoteId(null)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setNewQuoteText('')
    router.refresh()
  }

  function startEditingQuote(quote: ClubQuote) {
    setEditingQuoteId(quote.id)
    setQuoteDraftText(quote.quote)
  }

  async function handleUpdateQuote(quoteId: string) {
    const text = quoteDraftText.trim()
    if (!text) return
    setSavingQuoteId(quoteId)
    setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('club_quotes').update({ quote: text }).eq('id', quoteId)
    setSavingQuoteId(null)
    if (error) {
      setErrorMsg(error.message)
      return
    }
    setEditingQuoteId(null)
    router.refresh()
  }

  async function handleDeleteQuote(quoteId: string) {
    if (!window.confirm('Delete this quote?')) return
    setSavingQuoteId(quoteId)
    setErrorMsg('')
    const supabase = createClient()
    const { error } = await supabase.from('club_quotes').delete().eq('id', quoteId)
    setSavingQuoteId(null)
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
          {!showAddBook && (
            <button
              onClick={() => setShowAddBook(true)}
              className="px-4 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: WINE }}
            >
              + Add a book
            </button>
          )}
          <Link href={`/clubs/${club.slug}/account`} className="text-sm text-gray-500 hover:text-[#7B1E3A]">
            Change password
          </Link>
          <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-[#7B1E3A]">
            Log out
          </button>
        </div>
      </div>

      {errorMsg && <p className="text-sm text-red-600 mt-3">{errorMsg}</p>}

      {showAddBook && (
        <form onSubmit={handleAddBook} className="mt-4 bg-white rounded-2xl border border-rose-100 p-6 space-y-3">
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

      <div className="mt-6 rounded-2xl p-5 shadow-lg" style={{ backgroundColor: WINE }}>
        <h2 className="text-xs font-semibold uppercase tracking-wide mb-2 text-white/70">
          📅 Next Meeting
        </h2>

        {editingMeeting ? (
          <form onSubmit={handleSaveMeeting} className="space-y-3 bg-white rounded-xl p-4">
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Timezone</label>
                <select
                  required
                  value={meetingTimezone}
                  onChange={(e) => {
                    const newZone = e.target.value
                    if (meetingAt) {
                      const instant = zonedTimeToUtcIso(meetingAt, meetingTimezone)
                      setMeetingAt(utcToZonedInputValue(instant, newZone))
                    }
                    setMeetingTimezone(newZone)
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                >
                  {MEETING_TIMEZONES.map(({ label, zone }) => (
                    <option key={zone} value={zone}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
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
                className="px-4 py-2 rounded-lg text-gray-600 text-sm hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                {nextMeeting ? (
                  <>
                    <p className="text-lg font-semibold text-white">{formatMeetingDateOnly(nextMeeting.meeting_at)}</p>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1.5">
                      {MEETING_TIMEZONES.map(({ label, zone }) => (
                        <p key={zone} className="text-sm">
                          <span className="font-semibold text-white/70">{label}:</span>{' '}
                          <span className="font-semibold text-white">{formatZoneTime(nextMeeting.meeting_at, zone)}</span>
                        </p>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-white/70">No meeting scheduled yet.</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {nextMeeting?.zoom_link && (
                  <a
                    href={nextMeeting.zoom_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-lg font-medium text-sm bg-white"
                    style={{ color: WINE }}
                  >
                    Join Zoom ↗
                  </a>
                )}
                {nextMeeting ? (
                  <button onClick={openMeetingForm} className="text-xs text-white/70 hover:text-white">
                    Edit
                  </button>
                ) : (
                  <button
                    onClick={openMeetingForm}
                    className="px-4 py-2 rounded-lg font-medium text-sm bg-white"
                    style={{ color: WINE }}
                  >
                    + Schedule
                  </button>
                )}
              </div>
            </div>

            {(currentBook || nextBook) && (
              <div className="mt-4 pt-4 border-t border-white/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-1">Current book</p>
                  <BookLink book={currentBook} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-white/60 mb-1">Next book</p>
                  <BookLink book={nextBook} />
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="mt-6 flex gap-1 border-b border-rose-200">
        {(
          [
            { key: 'overview', label: 'Overview' },
            { key: 'ratings', label: 'My Ratings' },
            ...(currentMember.is_admin ? [{ key: 'admin', label: '⚙️ Admin' }] : []),
          ] as { key: 'overview' | 'ratings' | 'admin'; label: string }[]
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className="px-4 py-2 text-sm font-semibold border-b-2 -mb-px"
            style={
              activeTab === tab.key
                ? { color: WINE, borderColor: WINE }
                : { color: '#9CA3AF', borderColor: 'transparent' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && books.length > 0 && (
        <div className="mt-4 bg-white rounded-2xl border border-rose-100 p-4 overflow-x-auto">
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

      {activeTab === 'ratings' && (
      <>
      <div className="space-y-3 mt-4">
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
      </>
      )}

      {activeTab === 'admin' && currentMember.is_admin && (
        <div className="mt-4 space-y-6">
          <div className="bg-white rounded-2xl border border-rose-100 p-5">
            <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide mb-3">Manage scores</h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Book</label>
                  <select
                    value={adminBookId}
                    onChange={(e) => setAdminBookId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                  >
                    <option value="">Select a book</option>
                    {books.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.month_label} — {b.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Member</label>
                  <select
                    value={adminMemberId}
                    onChange={(e) => setAdminMemberId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                  >
                    <option value="">Select a member</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.display_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {(() => {
                const book = books.find((b) => b.id === adminBookId)
                if (!book || !adminMemberId) return null
                return (
                  <AdminScoreFields
                    key={`${adminBookId}::${adminMemberId}`}
                    book={book}
                    memberId={adminMemberId}
                    saving={savingAdminScore}
                    onSave={(score, comment) => handleSaveAdminScore(adminBookId, adminMemberId, score, comment)}
                  />
                )
              })()}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-rose-100 p-5">
            <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide mb-3">
              Manage quotes ({quotes.length})
            </h2>
            <form onSubmit={handleAddQuote} className="flex gap-2 mb-4">
              <input
                type="text"
                value={newQuoteText}
                onChange={(e) => setNewQuoteText(e.target.value)}
                placeholder="Add a new quote..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
              />
              <button
                type="submit"
                disabled={savingQuoteId === 'new' || !newQuoteText.trim()}
                className="px-4 py-2 rounded-lg text-white font-medium text-sm disabled:opacity-60 shrink-0"
                style={{ backgroundColor: WINE }}
              >
                + Add
              </button>
            </form>
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {quotes.length === 0 && (
                <p className="text-sm text-gray-400">No quotes yet — add one above.</p>
              )}
              {quotes.map((q) => (
                <div key={q.id} className="flex items-start gap-2 text-sm border-t border-gray-100 pt-2 first:border-t-0 first:pt-0">
                  {editingQuoteId === q.id ? (
                    <>
                      <input
                        type="text"
                        value={quoteDraftText}
                        onChange={(e) => setQuoteDraftText(e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
                      />
                      <button
                        onClick={() => handleUpdateQuote(q.id)}
                        disabled={savingQuoteId === q.id}
                        className="text-xs font-medium hover:underline shrink-0"
                        style={{ color: WINE }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingQuoteId(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 shrink-0"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="flex-1 text-gray-600">{q.quote}</p>
                      <button
                        onClick={() => startEditingQuote(q)}
                        className="text-xs font-medium hover:underline shrink-0"
                        style={{ color: WINE }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteQuote(q.id)}
                        disabled={savingQuoteId === q.id}
                        className="text-xs text-red-500 hover:text-red-700 shrink-0 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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

      {welcomeQuote && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
          onClick={() => setWelcomeQuote(null)}
        >
          <div
            className="rounded-2xl max-w-sm w-full p-8 text-center shadow-lg border-2"
            style={{ backgroundColor: '#FDF2F5', borderColor: WINE }}
            onClick={(e) => e.stopPropagation()}
          >
            <p className={`${script.className} text-3xl`} style={{ color: WINE }}>
              Hi {firstName(currentMember.display_name)}!
            </p>
            <p className="text-gray-600 mt-4 text-sm leading-relaxed">
              Always remember{' '}
              <span className="italic">{welcomeQuote}</span>
            </p>
            <button
              onClick={() => setWelcomeQuote(null)}
              className="mt-6 px-5 py-2 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: WINE }}
            >
              📚 Cheers
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
