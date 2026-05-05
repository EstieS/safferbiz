/**
 * import-candidates.mjs
 *
 * Reads candidates.csv (output from find-businesses.mjs) and bulk-imports
 * them into SafferBiz as PENDING listings for review in the admin panel.
 *
 * Usage: node scripts/import-candidates.mjs
 *
 * After running, go to safferbiz.com/admin and approve/reject each one.
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import * as dotenv from 'dotenv'
import * as readline from 'readline'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function parseCSV(content) {
  const lines = content.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim())

  return lines.slice(1).map(line => {
    // Handle quoted fields with commas inside
    const fields = []
    let current = ''
    let inQuotes = false

    for (let i = 0; i < line.length; i++) {
      const char = line[i]
      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        fields.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim())
        current = ''
      } else {
        current += char
      }
    }
    fields.push(current.replace(/^"|"$/g, '').replace(/""/g, '"').trim())

    const row = {}
    headers.forEach((h, i) => { row[h] = fields[i] ?? '' })
    return row
  }).filter(row => row.business_name) // skip empty rows
}

async function generateUniqueSlug(baseName) {
  const baseSlug = slugify(baseName)
  let slug = baseSlug
  let suffix = 2

  while (true) {
    const { data } = await supabase
      .from('listings')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!data) break // slug is available
    slug = `${baseSlug}-${suffix++}`
  }

  return slug
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question(question, answer => { rl.close(); resolve(answer.trim()) })
  })
}

async function main() {
  console.log('📥 SafferBiz Bulk Importer\n')

  // Read CSV
  let content
  try {
    content = readFileSync('candidates.csv', 'utf8')
  } catch {
    console.error('❌ candidates.csv not found! Run find-businesses.mjs first.')
    process.exit(1)
  }

  const rows = parseCSV(content)
  console.log(`📄 Found ${rows.length} candidates in candidates.csv\n`)

  // Preview first 5
  console.log('Preview (first 5):')
  rows.slice(0, 5).forEach((r, i) => {
    console.log(`  ${i + 1}. ${r.business_name} — ${r.country} — ${r.website_url}`)
  })
  console.log('')

  const answer = await prompt(`Import all ${rows.length} as PENDING listings? (yes/no): `)
  if (answer.toLowerCase() !== 'yes') {
    console.log('Cancelled.')
    process.exit(0)
  }

  console.log('\nImporting...\n')

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of rows) {
    const { business_name, website_url, country, category, description } = row

    if (!business_name || !country) { skipped++; continue }

    // Check if URL already exists in DB
    if (website_url) {
      const normUrl = website_url.toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
      const { data: existing } = await supabase
        .from('listings')
        .select('id')
        .ilike('website_url', `%${normUrl}%`)
        .single()

      if (existing) {
        console.log(`  ⏭️  Skipping (already exists): ${business_name}`)
        skipped++
        continue
      }
    }

    // Generate unique slug
    const slug = await generateUniqueSlug(business_name)

    // Insert as pending
    const { error } = await supabase.from('listings').insert({
      business_name: business_name.substring(0, 100),
      slug,
      description: description || null,
      category: category || 'Food & Grocery',
      country,
      city: null,
      website_url: website_url || null,
      status: 'pending',
      sells_online: false,
      tags: [],
    })

    if (error) {
      console.log(`  ❌ Error importing "${business_name}": ${error.message}`)
      errors++
    } else {
      console.log(`  ✅ ${business_name} (${country})`)
      imported++
    }

    // Small delay to avoid hammering Supabase
    await new Promise(r => setTimeout(r, 100))
  }

  console.log(`\n📊 Done!`)
  console.log(`  ✅ Imported: ${imported}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors:  ${errors}`)
  console.log(`\n👉 Go to safferbiz.com/admin to review and approve/reject each listing!`)
}

main().catch(console.error)
