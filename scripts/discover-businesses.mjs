/**
 * SafferBiz — Business Discovery Agent
 *
 * Searches for SA-owned or SA-expat businesses in a given country using Tavily,
 * extracts structured data with Claude Haiku, deduplicates against Supabase,
 * inserts new ones as pending, and emails the admin for review.
 *
 * Usage:
 *   node scripts/discover-businesses.mjs                          # uses today's scheduled country
 *   node scripts/discover-businesses.mjs --country="Australia"    # specific country
 *   node scripts/discover-businesses.mjs --dry-run                # preview without inserting
 *   node scripts/discover-businesses.mjs --limit=5                # max new records to insert
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

// ─── Schedule: day-of-week → country ─────────────────────────────────────────
const DAY_TO_COUNTRY = {
  1: 'South Africa',    // Monday
  2: 'United Kingdom',  // Tuesday
  3: 'Australia',       // Wednesday
  4: 'United States',   // Thursday
  5: 'Netherlands',     // Friday
  6: 'New Zealand',     // Saturday
  0: 'Canada',          // Sunday
}

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10
const countryArg = args.find(a => a.startsWith('--country='))
const country = countryArg
  ? countryArg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
  : DAY_TO_COUNTRY[new Date().getDay()] ?? 'United Kingdom'

// ─── Clients ──────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

function sleep(ms) { return new Promise(r => setTimeout(r, ms)) }

// ─── Agent 1a: Tavily search ──────────────────────────────────────────────────
async function tavilySearch(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query,
      search_depth: 'advanced',
      max_results: 8,
      include_answer: false,
    }),
  })
  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Tavily ${response.status}: ${text}`)
  }
  return response.json()
}

async function researchBusinesses(country) {
  console.log(`\n🔍 Agent 1: Researching SA businesses in ${country}...`)

  const queries = [
    `South African owned business shop ${country}`,
    `South African expat food grocery biltong boerewors ${country}`,
    `"South African" shop café restaurant "${country}"`,
  ]

  const allResults = []
  for (const query of queries) {
    try {
      console.log(`   Searching: "${query}"`)
      const data = await tavilySearch(query)
      if (data.results) allResults.push(...data.results)
      await sleep(500)
    } catch (e) {
      console.error(`   ⚠️  Search failed: ${e.message}`)
    }
  }

  // Deduplicate by URL
  const seen = new Set()
  const unique = allResults.filter(r => {
    if (seen.has(r.url)) return false
    seen.add(r.url)
    return true
  })

  console.log(`   Found ${unique.length} unique results`)
  return unique
}

// ─── Agent 1b: Extract structured data with Claude Haiku ─────────────────────
async function extractBusinessData(searchResults, country) {
  console.log(`\n🤖 Agent 1b: Extracting businesses from ${searchResults.length} results...`)

  const resultsText = searchResults
    .slice(0, 20)
    .map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${(r.content ?? '').slice(0, 300)}`)
    .join('\n\n---\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Extract South African-owned or SA-expat-serving businesses from these web search results for ${country}.

RULES:
- Only include businesses clearly South African-owned OR serving the SA expat/diaspora community
- Skip news articles, directories, Wikipedia, aggregators, Nando's/Woolworths corporate sites
- Return at most ${limit} businesses

For each qualifying business return a JSON object:
{
  "business_name": "...",
  "website_url": "...",
  "description": "One sentence: what they sell or do",
  "city": "...",
  "category": one of ["Food & Grocery","Restaurant & Takeaway","Beauty & Health","Home & Garden","Clothing & Fashion","Professional Services","Community & Events","Online Services","Other"]
}

Return ONLY a valid JSON array, no explanation. If nothing qualifies, return [].

Search results:
${resultsText}`,
    }],
  })

  try {
    const text = message.content[0].text.trim()
    const match = text.match(/\[[\s\S]*\]/)
    const businesses = match ? JSON.parse(match[0]) : []
    console.log(`   Extracted ${businesses.length} candidate businesses`)
    return businesses
  } catch (e) {
    console.error(`   ⚠️  Parse error: ${e.message}`)
    return []
  }
}

// ─── Agent 2: Deduplicate against Supabase ────────────────────────────────────
async function deduplicateBusinesses(candidates, country) {
  console.log(`\n🔎 Agent 2: Deduplicating ${candidates.length} candidates...`)

  const { data: existing, error } = await supabase
    .from('listings')
    .select('business_name, website_url')

  if (error) throw new Error(`Supabase fetch error: ${error.message}`)

  const existingNames = new Set(
    (existing ?? []).map(r => r.business_name.toLowerCase().trim())
  )
  const existingUrls = new Set(
    (existing ?? [])
      .map(r => r.website_url)
      .filter(Boolean)
      .map(u => u.toLowerCase().replace(/\/$/, ''))
  )

  const newOnes = candidates.filter(biz => {
    const nameMatch = existingNames.has(biz.business_name.toLowerCase().trim())
    const urlMatch = biz.website_url &&
      existingUrls.has(biz.website_url.toLowerCase().replace(/\/$/, ''))
    return !nameMatch && !urlMatch
  })

  console.log(`   ${candidates.length - newOnes.length} already in DB — ${newOnes.length} new`)
  return newOnes
}

// ─── Agent 3: Insert pending records ─────────────────────────────────────────
async function generateUniqueSlug(businessName) {
  const base = businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)

  const { data } = await supabase
    .from('listings')
    .select('slug')
    .eq('slug', base)
    .maybeSingle()

  if (!data) return base
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

async function createPendingRecords(businesses, country) {
  console.log(`\n📝 Agent 3: Creating ${businesses.length} pending records...`)

  const records = []
  for (const biz of businesses) {
    const slug = await generateUniqueSlug(biz.business_name)
    records.push({
      slug,
      business_name: biz.business_name,
      description: biz.description || null,
      category: biz.category || 'Other',
      country,
      city: biz.city || null,
      website_url: biz.website_url || null,
      status: 'pending',
      feature_on_social: false,
      tags: [],
      sells_online: false,
    })
  }

  if (isDryRun) {
    console.log('\n   DRY RUN — would insert:')
    records.forEach(r =>
      console.log(`   • ${r.business_name} (${r.city || 'no city'}) [${r.category}] → ${r.slug}`)
    )
    return records
  }

  const { data, error } = await supabase.from('listings').insert(records).select()
  if (error) throw new Error(`Insert error: ${error.message}`)
  console.log(`   ✅ Inserted ${data.length} pending listings`)
  return data
}

// ─── Notification email ───────────────────────────────────────────────────────
async function sendNotificationEmail(newListings, country) {
  if (newListings.length === 0) return

  const rows = newListings.map(l => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${l.business_name}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.city || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">
        ${l.website_url ? `<a href="${l.website_url}" style="color:#007A4D">${l.website_url}</a>` : '—'}
      </td>
    </tr>`).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:700px;margin:0 auto">
      <div style="background:#007A4D;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">🤖 SafferBiz Discovery Agent</h1>
        <p style="color:#a7f3d0;margin:4px 0 0">Found ${newListings.length} new SA businesses in <strong style="color:white">${country}</strong></p>
      </div>
      <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#374151;margin:0 0 16px">These listings have been added as <strong>pending</strong>. Please review and approve or reject each one.</p>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb">
          <thead>
            <tr style="background:#007A4D">
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Business</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">City</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Category</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Website</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="margin-top:20px;text-align:center">
          <a href="https://safferbiz.com/admin"
             style="background:#007A4D;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
            Review in Admin Dashboard →
          </a>
        </div>
      </div>
    </div>`

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: 'safferbiz@gmail.com' }] }],
      from: { email: process.env.SENDGRID_FROM_EMAIL, name: 'SafferBiz Agent' },
      subject: `🤖 ${newListings.length} new SA businesses found in ${country}`,
      content: [{ type: 'text/html', value: html }],
    }),
  })

  if (!res.ok) {
    console.error(`   ⚠️  Email send failed: ${res.status}`)
  } else {
    console.log(`\n📧 Notification email sent → safferbiz@gmail.com`)
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n🇿🇦 SafferBiz Business Discovery Agent')
  console.log(`📍 Country : ${country}`)
  console.log(`🔢 Limit   : ${limit}`)
  console.log(`🧪 Dry run : ${isDryRun}`)
  console.log('─'.repeat(45))

  // Agent 1: Research
  const searchResults = await researchBusinesses(country)
  if (searchResults.length === 0) {
    console.log('\nNo search results returned. Exiting.')
    return
  }

  const candidates = await extractBusinessData(searchResults, country)
  if (candidates.length === 0) {
    console.log('\nNo SA businesses extracted from results. Exiting.')
    return
  }

  // Agent 2: Deduplicate
  const newBusinesses = await deduplicateBusinesses(candidates, country)
  if (newBusinesses.length === 0) {
    console.log('\n✅ All candidates already exist in the database. Nothing to add.')
    return
  }

  // Agent 3: Insert
  const inserted = await createPendingRecords(newBusinesses.slice(0, limit), country)

  // Notify admin
  if (!isDryRun) {
    await sendNotificationEmail(inserted, country)
  }

  console.log(`\n✅ Done! ${inserted.length} pending listing(s) added for ${country}.`)
  if (!isDryRun) {
    console.log('   Review at: https://safferbiz.com/admin')
  }
}

main().catch(e => { console.error('\n❌ Fatal error:', e.message); process.exit(1) })
