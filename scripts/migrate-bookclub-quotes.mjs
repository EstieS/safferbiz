import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { bookClubQuotes } from '../src/lib/bookClubQuotes.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

const CLUB_SLUG = 'bubbles-and-books'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const { data: club, error: clubError } = await supabase
  .from('clubs')
  .select('id')
  .eq('slug', CLUB_SLUG)
  .single()

if (clubError || !club) {
  console.error('Could not find club:', clubError?.message)
  process.exit(1)
}

const { data: existing, error: existingError } = await supabase
  .from('club_quotes')
  .select('quote')
  .eq('club_id', club.id)

if (existingError) {
  console.error('Could not read existing quotes:', existingError.message)
  process.exit(1)
}

const existingSet = new Set(existing.map((q) => q.quote))
const toInsert = bookClubQuotes
  .filter((quote) => !existingSet.has(quote))
  .map((quote) => ({ club_id: club.id, quote }))

if (toInsert.length === 0) {
  console.log('Nothing to migrate — all quotes already present.')
  process.exit(0)
}

const { error: insertError } = await supabase.from('club_quotes').insert(toInsert)

if (insertError) {
  console.error('Insert failed:', insertError.message)
  process.exit(1)
}

console.log(`Migrated ${toInsert.length} quote(s) into club_quotes for "${CLUB_SLUG}".`)
