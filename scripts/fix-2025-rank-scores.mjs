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

// 2025 was scored as a ranking (1 = favorite of the year ... N = least favorite),
// not an independent 1-10 rating like 2026. Converting rank -> score out of 10:
//   score = 10 * (N - rank) / (N - 1)
// where N is how many 2025 books that member ranked (Katoo joined partway through,
// so she only ranked the 4 books from August onward, out of her own N=4).
function rankToScore(rank, n) {
  const score = (10 * (n - rank)) / (n - 1)
  return Math.round(score * 10) / 10
}

// Original ranks straight from the "2025 - Book of the Year" Google Sheet
// (used as the source of truth instead of re-reading the DB, since a couple
// of these have already been hand-corrected in the app to their final value).
const RANKS_2025 = [
  { title: 'Finlay Donovan Is Killing It: A Novel', ranks: { Elna: 8, Estie: 7, Joanne: 7, Achenita: 5 } },
  { title: 'It Ends with Us', ranks: { Elna: 4, Estie: 4, Joanne: 8, Achenita: 6 } },
  { title: 'The Lost Bookshop', ranks: { Elna: 3, Estie: 6, Joanne: 4, Achenita: 4 } },
  { title: 'Let Them', ranks: { Elna: 5, Estie: 3, Joanne: 5, Achenita: 9 } },
  { title: 'The Women', ranks: { Elna: 1, Estie: 1, Joanne: 1, Achenita: 1 } },
  { title: 'All the Colors of the Dark', ranks: { Elna: 6, Katoo: 3, Estie: 9, Joanne: 2, Achenita: 3 } },
  { title: 'The Nightingale', ranks: { Elna: 2, Katoo: 2, Estie: 2, Joanne: 3, Achenita: 2 } },
  { title: 'The Dressmaker', ranks: { Elna: 7, Katoo: 4, Estie: 5, Joanne: 6, Achenita: 7 } },
  { title: 'The Courage to Be Disliked', ranks: { Elna: 9, Katoo: 1, Estie: 8, Joanne: 9, Achenita: 8 } },
]

const EMAIL_BY_NAME = {
  Elna: 'evanvuuren@gmail.com',
  Katoo: 'k.vandermerwe@franklincovey.co.uk',
  Estie: 'estiesa@gmail.com',
  Joanne: 'joanne.van.vuuren@gmail.com',
  Achenita: 'achenita.hartslief@gmail.com',
}

// N per member = how many 2025 books they have a rank for
const nByName = {}
for (const { ranks } of RANKS_2025) {
  for (const name of Object.keys(ranks)) {
    nByName[name] = (nByName[name] ?? 0) + 1
  }
}

const { data: club, error: clubError } = await supabase
  .from('clubs')
  .select('id')
  .eq('slug', CLUB_SLUG)
  .single()

if (clubError || !club) {
  console.error('Club not found:', clubError?.message)
  process.exit(1)
}

const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 200 })
const { data: membersData } = await supabase.from('club_members').select('id, user_id').eq('club_id', club.id)
const emailByUserId = new Map(authUsers.users.map((u) => [u.id, u.email?.toLowerCase()]))
const memberIdByEmail = new Map(membersData.map((m) => [emailByUserId.get(m.user_id), m.id]))

let updated = 0

for (const { title, ranks } of RANKS_2025) {
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id')
    .eq('club_id', club.id)
    .eq('title', title)
    .like('month_label', '%2025')
    .single()

  if (bookError || !book) {
    console.error(`✗ ${title}: book not found (${bookError?.message})`)
    continue
  }

  for (const [name, rank] of Object.entries(ranks)) {
    const email = EMAIL_BY_NAME[name]
    const clubMemberId = memberIdByEmail.get(email)
    if (!clubMemberId) {
      console.error(`  ✗ No club_member for ${name}`)
      continue
    }

    const score = rankToScore(rank, nByName[name])
    const { error } = await supabase
      .from('book_scores')
      .upsert(
        { book_id: book.id, club_member_id: clubMemberId, score },
        { onConflict: 'book_id,club_member_id' }
      )

    if (error) {
      console.error(`  ✗ ${name} on ${title}: ${error.message}`)
      continue
    }
    updated++
    console.log(`${title.padEnd(45)} ${name.padEnd(10)} rank ${rank}/${nByName[name]} -> ${score}`)
  }
}

console.log(`\nDone. ${updated} 2025 scores converted from rank to out-of-10.\n`)
