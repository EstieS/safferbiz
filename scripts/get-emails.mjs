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

const { data } = await supabase
  .from('listings')
  .select('business_name, email, city, country')
  .eq('status', 'active')
  .order('business_name')

const unique = [...new Map(data.map(l => [l.email, l])).values()]
console.log(`${unique.length} unique emails:\n`)
unique.forEach(l => {
  const location = [l.city, l.country].filter(Boolean).join(', ')
  console.log(`${l.email} | ${l.business_name} | ${location}`)
})
