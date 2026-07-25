import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const CLUB_SLUG = 'bubbles-and-books'

// Fill in your 5 members here, then run: node scripts/seed-bookclub-members.mjs
const members = [
  { email: 'joanne.van.vuuren@gmail.com', name: 'Joanne' },
  { email: 'estiesa@gmail.com', name: 'Estie' },
  { email: 'evanvuuren@gmail.com', name: 'Elna' },
  { email: 'achenita.hartslief@gmail.com', name: 'Achenita' },
  { email: 'k.vandermerwe@franklincovey.co.uk', name: 'Katoo' },
]

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url')
}

const { data: club, error: clubError } = await supabase
  .from('clubs')
  .select('id, name')
  .eq('slug', CLUB_SLUG)
  .single()

if (clubError || !club) {
  console.error(`Club "${CLUB_SLUG}" not found. Run supabase/bookclub.sql first.`, clubError?.message)
  process.exit(1)
}

const credentials = []

async function findExistingUserId(email) {
  let page = 1
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((u) => u.email?.toLowerCase() === email)
    if (match) return match.id
    if (data.users.length < 200) return null
    page += 1
  }
}

for (const member of members) {
  const email = member.email.trim().toLowerCase()
  const password = generateTempPassword()

  let userId
  let isNewAccount = true

  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: member.name },
  })

  if (userError) {
    if (!userError.message.includes('already been registered')) {
      console.error(`✗ ${email}: ${userError.message}`)
      continue
    }
    isNewAccount = false
    userId = await findExistingUserId(email)
    if (!userId) {
      console.error(`✗ ${email}: registered but couldn't find matching user id`)
      continue
    }
  } else {
    userId = userData.user.id
  }

  const { error: memberError } = await supabase
    .from('club_members')
    .upsert(
      { club_id: club.id, user_id: userId, display_name: member.name },
      { onConflict: 'club_id,user_id' }
    )

  if (memberError) {
    console.error(`✗ ${email} joined but failed to save to club: ${memberError.message}`)
    continue
  }

  if (isNewAccount) {
    credentials.push({ name: member.name, email, password })
  } else {
    console.log(`✓ ${email} already had an account — linked to the club (existing password unchanged).`)
  }
}

console.log(`\n${club.name} — send each person their temporary password (they can change it after logging in):\n`)
for (const c of credentials) {
  console.log(`  ${c.name.padEnd(20)} ${c.email.padEnd(30)} ${c.password}`)
}
console.log(`\nLogin at: https://safferbiz.com/clubs/${CLUB_SLUG}/login\n`)
