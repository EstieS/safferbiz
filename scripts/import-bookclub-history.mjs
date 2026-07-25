import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CLUB_SLUG = 'bubbles-and-books'

const EMAIL_BY_NAME = {
  Elna: 'evanvuuren@gmail.com',
  Katoo: 'k.vandermerwe@franklincovey.co.uk',
  Estie: 'estiesa@gmail.com',
  Joanne: 'joanne.van.vuuren@gmail.com',
  Achenita: 'achenita.hartslief@gmail.com',
}

// From "2025 - Book of the Year" and "2026 - Book of the Year" Google Sheets
const books = [
  { year: 2025, month: 'January', title: 'Finlay Donovan Is Killing It: A Novel', scores: { Elna: 8, Estie: 7, Joanne: 7, Achenita: 5 } },
  { year: 2025, month: 'February', title: 'It Ends with Us', scores: { Elna: 4, Estie: 4, Joanne: 8, Achenita: 6 } },
  { year: 2025, month: 'April', title: 'The Lost Bookshop', scores: { Elna: 3, Estie: 6, Joanne: 4, Achenita: 4 } },
  { year: 2025, month: 'May', title: 'Let Them', scores: { Elna: 5, Estie: 3, Joanne: 5, Achenita: 9 } },
  { year: 2025, month: 'July', title: 'The Women', scores: { Elna: 1, Estie: 1, Joanne: 1, Achenita: 1 } },
  { year: 2025, month: 'August', title: 'All the Colors of the Dark', scores: { Elna: 6, Katoo: 3, Estie: 9, Joanne: 2, Achenita: 3 } },
  { year: 2025, month: 'September', title: 'The Nightingale', scores: { Elna: 2, Katoo: 2, Estie: 2, Joanne: 3, Achenita: 2 } },
  { year: 2025, month: 'October', title: 'The Dressmaker', scores: { Elna: 7, Katoo: 4, Estie: 5, Joanne: 6, Achenita: 7 } },
  { year: 2025, month: 'November', title: 'The Courage to Be Disliked', scores: { Elna: 9, Katoo: 1, Estie: 8, Joanne: 9, Achenita: 8 } },

  { year: 2026, month: 'January', title: 'Wild Dark Shore', pickedBy: 'Elna', scores: { Elna: 7, Katoo: 7, Estie: 6, Joanne: 7, Achenita: 9 } },
  { year: 2026, month: 'February', title: 'Nuclear War', pickedBy: 'Achenita', scores: { Elna: 8, Katoo: 9, Estie: 7, Joanne: 9, Achenita: 8 } },
  { year: 2026, month: 'March', title: 'Here One Moment', pickedBy: 'Estie', scores: { Elna: 9, Katoo: 8, Estie: 5, Joanne: 8, Achenita: 6 } },
  { year: 2026, month: 'April', title: 'Last Man Off', pickedBy: 'Joanne', scores: { Elna: 5, Katoo: 8, Estie: 3, Joanne: 6.5, Achenita: 7 } },
  { year: 2026, month: 'May', title: 'Replay: Memoir of an Uprooted Family', pickedBy: 'Katoo', scores: { Elna: 8, Katoo: 8, Estie: 6, Joanne: 6.5, Achenita: 7.5 } },
  { year: 2026, month: 'June', title: 'Hidden Figures', pickedBy: 'Elna', scores: { Elna: 9, Katoo: 8, Estie: 8, Joanne: 7, Achenita: 6 } },
  { year: 2026, month: 'July', title: 'A Gentleman in Moscow', pickedBy: 'Achenita', scores: { Elna: 6, Katoo: 10, Estie: 5, Joanne: 8, Achenita: 9 } },
  { year: 2026, month: 'August', title: 'The Midnight Train', pickedBy: 'Estie', scores: { Estie: 8 } },
  { year: 2026, month: 'September', title: 'The Girl Behind the Gates', pickedBy: 'Joanne', scores: {} },
]

const { data: club, error: clubError } = await supabase
  .from('clubs')
  .select('id, name')
  .eq('slug', CLUB_SLUG)
  .single()

if (clubError || !club) {
  console.error(`Club "${CLUB_SLUG}" not found.`, clubError?.message)
  process.exit(1)
}

const { data: membersData, error: membersError } = await supabase
  .from('club_members')
  .select('id, user_id')
  .eq('club_id', club.id)

if (membersError) {
  console.error('Failed to load club members:', membersError.message)
  process.exit(1)
}

const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({ perPage: 200 })
if (authError) {
  console.error('Failed to load auth users:', authError.message)
  process.exit(1)
}

const emailByUserId = new Map(authUsers.users.map((u) => [u.id, u.email?.toLowerCase()]))
const memberIdByEmail = new Map(
  membersData.map((m) => [emailByUserId.get(m.user_id), m.id])
)

let created = 0
let skipped = 0
let scoresWritten = 0

for (const book of books) {
  const monthLabel = `${book.month} ${book.year}`

  const { data: existing } = await supabase
    .from('books')
    .select('id')
    .eq('club_id', club.id)
    .eq('title', book.title)
    .eq('month_label', monthLabel)
    .maybeSingle()

  let bookId = existing?.id

  if (bookId) {
    skipped++
  } else {
    const { data: inserted, error: insertError } = await supabase
      .from('books')
      .insert({
        club_id: club.id,
        title: book.title,
        month_label: monthLabel,
        picked_by: book.pickedBy ?? null,
      })
      .select('id')
      .single()

    if (insertError) {
      console.error(`✗ ${monthLabel} — ${book.title}: ${insertError.message}`)
      continue
    }
    bookId = inserted.id
    created++
  }

  for (const [name, score] of Object.entries(book.scores)) {
    const email = EMAIL_BY_NAME[name]
    const clubMemberId = memberIdByEmail.get(email)
    if (!clubMemberId) {
      console.error(`  ✗ No club_member found for ${name} (${email})`)
      continue
    }

    const { error: scoreError } = await supabase
      .from('book_scores')
      .upsert(
        { book_id: bookId, club_member_id: clubMemberId, score },
        { onConflict: 'book_id,club_member_id' }
      )

    if (scoreError) {
      console.error(`  ✗ Score for ${name} on ${book.title}: ${scoreError.message}`)
    } else {
      scoresWritten++
    }
  }
}

console.log(`\nDone. ${created} books created, ${skipped} already existed, ${scoresWritten} scores written.\n`)
