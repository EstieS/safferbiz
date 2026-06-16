/**
 * SafferBiz — Event Discovery Agent
 *
 * Searches for upcoming SA expat events in a given country using Tavily,
 * extracts structured data with Claude Haiku, deduplicates against Supabase,
 * inserts new ones as pending, and emails the admin for review.
 *
 * Usage:
 *   node scripts/discover-events.mjs                          # uses today's scheduled country
 *   node scripts/discover-events.mjs --country="Australia"    # specific country
 *   node scripts/discover-events.mjs --dry-run                # preview without inserting
 *   node scripts/discover-events.mjs --limit=5                # max new records to insert
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

// ─── Schedule: day-of-week → country (same as business agent) ────────────────
const DAY_TO_COUNTRY = {
  1: 'rotate2',         // Monday → second rotation slot (offset half-cycle from Sunday)
  2: 'United Kingdom',  // Tuesday
  3: 'Australia',       // Wednesday
  4: 'United States',   // Thursday
  5: 'Netherlands',     // Friday
  6: 'New Zealand',     // Saturday
  0: 'rotate',          // Sunday → rotates through unlisted countries
}

// ─── Rotation list (mirrors discover-businesses.mjs) ─────────────────────────
const ROTATE_COUNTRIES = [
  'China', 'Colombia', 'France', 'Germany', 'Greece', 'Hong Kong',
  'India', 'Ireland', 'Israel', 'Italy', 'Luxembourg', 'Mauritius',
  'Mexico', 'Poland', 'Portugal', 'Singapore', 'South Korea', 'Spain',
  'Thailand', 'United Arab Emirates',
  '__worldwide__',
]

// Monday rotates half a cycle ahead of Sunday so the two rotation days never
// pick the same country — roughly doubling how often each rotation country runs.
const ROTATE_OFFSET = Math.floor(ROTATE_COUNTRIES.length / 2)
function getRotatingCountry(offset = 0) {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000))
  return ROTATE_COUNTRIES[(weekNumber + offset) % ROTATE_COUNTRIES.length]
}

// ─── CLI args ─────────────────────────────────────────────────────────────────
const args = process.argv.slice(2)
const isDryRun = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1]) : 10
const countryArg = args.find(a => a.startsWith('--country='))
const rawCountry = countryArg
  ? countryArg.split('=').slice(1).join('=').replace(/^["']|["']$/g, '')
  : DAY_TO_COUNTRY[new Date().getDay()] ?? 'United Kingdom'

const country =
  rawCountry === 'rotate'  ? getRotatingCountry(0) :
  rawCountry === 'rotate2' ? getRotatingCountry(ROTATE_OFFSET) :
  rawCountry
const isWorldwide = country === '__worldwide__'

// ─── Date helpers ─────────────────────────────────────────────────────────────
const today = new Date()
const todayStr = today.toISOString().slice(0, 10)
const year = today.getFullYear()
const nextYear = year + 1

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

async function researchEvents(country) {
  const label = isWorldwide ? 'worldwide' : country
  console.log(`\n🔍 Agent 1: Searching for SA events — ${label} (${year}–${nextYear})...`)

  const queries = isWorldwide
    ? [
        `South African expat community event worldwide ${year}`,
        `"South African" gathering braai festival overseas diaspora ${year}`,
        `SA expat reunion event international ${year}`,
      ]
    : [
        `South African expat community event ${country} ${year}`,
        `"South African" gathering braai festival market ${country} ${year}`,
        `SA expat event reunion ${country} upcoming ${year}`,
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

// ─── Agent 1b: Extract structured event data with Claude Haiku ───────────────
async function extractEventData(searchResults, country) {
  console.log(`\n🤖 Agent 1b: Extracting events from ${searchResults.length} results...`)

  const resultsText = searchResults
    .slice(0, 20)
    .map(r => `Title: ${r.title}\nURL: ${r.url}\nSnippet: ${(r.content ?? '').slice(0, 400)}`)
    .join('\n\n---\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `Extract upcoming South African expat community events from these web search results for ${country}.

Today's date is ${todayStr}. Only include events that:
- Are clearly SA expat / South African community events
- Are held OUTSIDE South Africa (exclude any event taking place inside South Africa — this is for the SA diaspora abroad)
- Have a specific future date (after ${todayStr})
- Are real ticketed or public events (not vague meetups without dates)
- Skip past events, recurring weekly pub nights without specific dates, general community pages

For each qualifying event return a JSON object:
{
  "title": "...",
  "event_date": "YYYY-MM-DD",
  "event_time": "...",          // e.g. "2:00 PM" or null if unknown
  "city": "...",                // city name or null
  "venue": "...",               // venue name or null
  "description": "...",         // 1-2 sentences
  "url": "...",                 // event page URL or null
  "organizer_name": "...",      // organizer/group name or null
  "category": one of ["Food & Braai", "Cultural & Heritage", "Sports & Outdoors", "Music & Entertainment", "Community & Social", "Markets & Fairs", "Other"]
}

Return ONLY a valid JSON array, no explanation. If nothing qualifies, return [].

Search results:
${resultsText}`,
    }],
  })

  try {
    const text = message.content[0].text.trim()
    const match = text.match(/\[[\s\S]*\]/)
    const events = match ? JSON.parse(match[0]) : []

    // Filter out any events Claude still returned with past/invalid dates
    const futureEvents = events.filter(e => {
      if (!e.event_date || !/^\d{4}-\d{2}-\d{2}$/.test(e.event_date)) return false
      return e.event_date >= todayStr
    })

    console.log(`   Extracted ${futureEvents.length} upcoming candidate events (${events.length - futureEvents.length} filtered as past/invalid)`)
    return futureEvents
  } catch (e) {
    console.error(`   ⚠️  Parse error: ${e.message}`)
    return []
  }
}

// ─── Agent 2: Deduplicate against Supabase ────────────────────────────────────
async function deduplicateEvents(candidates, country) {
  console.log(`\n🔎 Agent 2: Deduplicating ${candidates.length} candidates...`)

  const { data: existing, error } = await supabase
    .from('events')
    .select('title, event_date, url')
    .eq('country', country)
    .gte('event_date', todayStr)

  if (error) throw new Error(`Supabase fetch error: ${error.message}`)

  const existingTitles = new Set(
    (existing ?? []).map(e => e.title.toLowerCase().trim())
  )
  const existingUrls = new Set(
    (existing ?? []).map(e => e.url).filter(Boolean).map(u => u.toLowerCase().replace(/\/$/, ''))
  )
  const existingDateTitle = new Set(
    (existing ?? []).map(e => `${e.event_date}::${e.title.toLowerCase().trim()}`)
  )

  const newOnes = candidates.filter(evt => {
    const titleMatch = existingTitles.has(evt.title.toLowerCase().trim())
    const urlMatch = evt.url && existingUrls.has(evt.url.toLowerCase().replace(/\/$/, ''))
    const dateTitleMatch = existingDateTitle.has(`${evt.event_date}::${evt.title.toLowerCase().trim()}`)
    return !titleMatch && !urlMatch && !dateTitleMatch
  })

  console.log(`   ${candidates.length - newOnes.length} already in DB — ${newOnes.length} new`)
  return newOnes
}

// ─── Agent 3: Insert pending records ─────────────────────────────────────────
async function generateUniqueSlug(title, date) {
  const base = `${title}-${date}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 70)

  const { data } = await supabase
    .from('events')
    .select('slug')
    .eq('slug', base)
    .maybeSingle()

  if (!data) return base
  const suffix = Math.random().toString(36).slice(2, 6)
  return `${base}-${suffix}`
}

async function createPendingRecords(events, country) {
  console.log(`\n📝 Agent 3: Creating ${events.length} pending event records...`)

  const records = []
  for (const evt of events) {
    const slug = await generateUniqueSlug(evt.title, evt.event_date)
    records.push({
      slug,
      title: evt.title,
      description: evt.description || null,
      event_date: evt.event_date,
      event_time: evt.event_time || null,
      venue: evt.venue || null,
      city: evt.city || null,
      country,
      url: evt.url || null,
      organizer_name: evt.organizer_name || null,
      category: evt.category || 'Other',
      status: 'pending',
    })
  }

  if (isDryRun) {
    console.log('\n   DRY RUN — would insert:')
    records.forEach(r =>
      console.log(`   • ${r.event_date} — ${r.title} (${r.city || 'no city'}) [${r.category}]`)
    )
    return records
  }

  const { data, error } = await supabase.from('events').insert(records).select()
  if (error) throw new Error(`Insert error: ${error.message}`)
  console.log(`   ✅ Inserted ${data.length} pending events`)
  return data
}

// ─── Notification email ───────────────────────────────────────────────────────
async function sendNotificationEmail(newEvents, country) {
  if (newEvents.length === 0) return

  const rows = newEvents.map(e => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #eee;font-weight:600">${e.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${e.event_date}${e.event_time ? ' ' + e.event_time : ''}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${e.city || '—'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">${e.category}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #eee">
        ${e.url ? `<a href="${e.url}" style="color:#DE3831">View →</a>` : '—'}
      </td>
    </tr>`).join('')

  const html = `
    <div style="font-family:sans-serif;max-width:750px;margin:0 auto">
      <div style="background:#DE3831;padding:20px 24px;border-radius:8px 8px 0 0">
        <h1 style="color:white;margin:0;font-size:20px">🎉 SafferBiz Event Discovery Agent</h1>
        <p style="color:#fca5a5;margin:4px 0 0">Found ${newEvents.length} new SA events in <strong style="color:white">${country}</strong></p>
      </div>
      <div style="background:#f9fafb;padding:20px 24px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#374151;margin:0 0 16px">These events have been added as <strong>pending</strong>. Please verify dates and details before approving.</p>
        <table style="width:100%;border-collapse:collapse;background:white;border-radius:6px;overflow:hidden;border:1px solid #e5e7eb">
          <thead>
            <tr style="background:#DE3831">
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Event</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Date</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">City</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Category</th>
              <th style="padding:10px 12px;text-align:left;color:white;font-size:13px">Link</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#6b7280;font-size:13px;margin-top:16px">⚠️ Always verify event dates and details — AI extraction can occasionally get dates wrong.</p>
        <div style="margin-top:16px;text-align:center">
          <a href="https://safferbiz.com/admin"
             style="background:#DE3831;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:15px;display:inline-block">
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
      subject: `🎉 ${newEvents.length} new SA events found in ${country}`,
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
  console.log('\n🎉 SafferBiz Event Discovery Agent')
  console.log(`📍 Country : ${country}`)
  console.log(`📅 From    : ${todayStr}`)
  console.log(`🔢 Limit   : ${limit}`)
  console.log(`🧪 Dry run : ${isDryRun}`)
  console.log('─'.repeat(45))

  // Agent 1: Research
  const searchResults = await researchEvents(country)
  if (searchResults.length === 0) {
    console.log('\nNo search results returned. Exiting.')
    return
  }

  const candidates = await extractEventData(searchResults, country)
  if (candidates.length === 0) {
    console.log('\nNo upcoming SA events extracted. Exiting.')
    return
  }

  // Agent 2: Deduplicate
  const newEvents = await deduplicateEvents(candidates, country)
  if (newEvents.length === 0) {
    console.log('\n✅ All candidates already exist in the database. Nothing to add.')
    return
  }

  // Agent 3: Insert
  const inserted = await createPendingRecords(newEvents.slice(0, limit), country)

  // Notify admin
  if (!isDryRun) {
    await sendNotificationEmail(inserted, country)
  }

  console.log(`\n✅ Done! ${inserted.length} pending event(s) added for ${country}.`)
  if (!isDryRun) {
    console.log('   Review at: https://safferbiz.com/admin')
  }
}

main().catch(e => { console.error('\n❌ Fatal error:', e.message); process.exit(1) })
