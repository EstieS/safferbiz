import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import crypto from 'crypto'
import { STARTER_ROUTINES } from './fitness-library.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const GROUP_SLUG = 'sweat-sisters'

// Fill in members here, then run: node scripts/seed-fitness.mjs
// Safe to re-run: existing accounts keep their password, the library is only seeded once.
const members = [
  { email: 'estiesa@gmail.com', name: 'Estie', equipment: 'dumbbells' },
  // { email: 'sister@example.com', name: 'Sister', equipment: 'dumbbells' }, (already seeded - keep real emails out of this public repo)
]

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url')
}

const { data: group, error: groupError } = await supabase
  .from('fit_groups')
  .select('id, name')
  .eq('slug', GROUP_SLUG)
  .single()

if (groupError || !group) {
  console.error(`Group "${GROUP_SLUG}" not found. Run supabase/fitness.sql first.`, groupError?.message)
  process.exit(1)
}

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

const credentials = []

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

  // Only set equipment on first join so we don't overwrite a choice made in the app
  const { data: existing } = await supabase
    .from('fit_members')
    .select('id')
    .eq('group_id', group.id)
    .eq('user_id', userId)
    .maybeSingle()

  const { error: memberError } = existing
    ? await supabase.from('fit_members').update({ display_name: member.name }).eq('id', existing.id)
    : await supabase.from('fit_members').insert({
        group_id: group.id,
        user_id: userId,
        display_name: member.name,
        equipment: member.equipment ?? 'dumbbells',
      })

  if (memberError) {
    console.error(`✗ ${email} failed to save to group: ${memberError.message}`)
    continue
  }

  if (isNewAccount) {
    credentials.push({ name: member.name, email, password })
  } else {
    console.log(`✓ ${email} already had an account - linked to ${group.name} (existing password unchanged).`)
  }
}

const { count } = await supabase
  .from('fit_routines')
  .select('id', { count: 'exact', head: true })
  .eq('group_id', group.id)

if (!count) {
  const rows = STARTER_ROUTINES.map((r) => ({ ...r, group_id: group.id, notes: r.notes ?? null }))
  const { error } = await supabase.from('fit_routines').insert(rows)
  if (error) console.error(`✗ Failed to seed routine library: ${error.message}`)
  else console.log(`✓ Seeded ${rows.length} starter routines.`)
} else {
  console.log(`✓ Library already has ${count} routines - left as is.`)
}

if (credentials.length) {
  console.log(`\n${group.name} - send each person their temporary password (they can change it after logging in):\n`)
  for (const c of credentials) {
    console.log(`  ${c.name.padEnd(20)} ${c.email.padEnd(30)} ${c.password}`)
  }
}
console.log(`\nLogin at: https://www.safferbiz.com/fit/${GROUP_SLUG}/login\n`)
