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

const subscribers = [
  { email: 'estiesa@gmail.com', name: 'Estie' },
  { email: 'yolande213@gmail.com', name: 'Yolande Degenaar' },
  { email: 'margaux.pretorius@kw.com', name: 'Margaux' },
  { email: 'madielovric@gmail.com', name: 'Madie' },
  { email: 'geritajoubert@gmail.com', name: 'Gerrie' },
  { email: 'vanrenabck@gmail.com', name: 'Amelia' },
  { email: 'janinevs@yahoo.com', name: 'Janine' },
  { email: 'SharonC@miway.co.za', name: 'Sharon' },
  { email: 'joannevanvuuren@gmail.com', name: 'Joanne' },
  { email: 'achenita.hartslief@gmail.com', name: 'Achenita' },
  { email: 'katoovan@gmail.com', name: 'Katoo' },
  { email: 'evanvuuren@gmail.com', name: 'Elna' },
  { email: 'saundjoh@gmail.com', name: 'Soggies' },
  { email: 'brad@anassis.com', name: 'Brad Anassis' },
  { email: 'trevor@talentnetwork.co.za', name: 'Trevor' },
  { email: 'antmegusa@gmail.com', name: 'Anthony' },
]

const rows = subscribers.map(s => ({
  email: s.email.trim().toLowerCase(),
  name: s.name.trim(),
  countries: ['United States'],
  categories: ['Food & Grocery'],
  wants_events: true,
}))

const { data, error } = await supabase
  .from('subscribers')
  .upsert(rows, { onConflict: 'email' })

if (error) {
  console.error('Import failed:', error.message)
} else {
  console.log(`✓ ${rows.length} subscribers imported successfully!`)
}
