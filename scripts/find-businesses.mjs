/**
 * find-businesses.mjs
 *
 * Searches the web for South African businesses worldwide using Brave Search API
 * and outputs a list of candidates (not already in SafferBiz) to candidates.csv for review.
 *
 * Usage: node scripts/find-businesses.mjs
 *
 * Free tier: $5/month in credits = 1,000 searches/month free
 * This script uses ~24 per run (8 countries × 3 queries) — basically free forever
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const BRAVE_API_KEY = process.env.BRAVE_SEARCH_API_KEY
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!BRAVE_API_KEY) {
  console.error('❌ Set BRAVE_SEARCH_API_KEY in .env.local first!')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Countries to search — start with the biggest SA expat destinations
const COUNTRIES_TO_SEARCH = [
  'Australia',
  'United Kingdom',
  'United States',
  'Canada',
  'New Zealand',
  'Netherlands',
  'Germany',
  'UAE',
]

// 3 search queries per country = 24 total API calls per run
const QUERY_TEMPLATES = [
  (c) => `"South African" shop OR store ${c}`,
  (c) => `biltong boerewors ${c}`,
  (c) => `"South African food" OR "SA groceries" ${c}`,
]

// Keywords that suggest SA relevance
const SA_KEYWORDS = [
  'south african', 'saffer', 'biltong', 'boerewors', 'braai', 'rooibos',
  'droëwors', 'droewors', 'koeksister', 'peri-peri', 'potjie', 'melktert',
  'chakalaka', 'bobotie', 'springbok', 'sa shop', 'sa food', 'sa expat',
  'cape town', 'johannesburg', 'durban', 'pretoria',
]

// Domains to skip
const SKIP_DOMAINS = [
  'facebook.com', 'instagram.com', 'twitter.com', 'youtube.com',
  'linkedin.com', 'wikipedia.org', 'tripadvisor.com', 'yelp.com',
  'reddit.com', 'amazon.com', 'ebay.com', 'etsy.com', 'tiktok.com',
]

function isSARelated(text) {
  const lower = text.toLowerCase()
  return SA_KEYWORDS.some((k) => lower.includes(k))
}

function shouldSkipUrl(url) {
  return SKIP_DOMAINS.some((d) => url.includes(d))
}

function normaliseUrl(url) {
  return url.toLowerCase()
    .replace(/^https?:\/\/(www\.)?/, '')
    .replace(/\/$/, '')
    .split('/')[0]
    .split('?')[0]
}

function guessCategoryFromText(text) {
  const lower = text.toLowerCase()
  if (lower.match(/restaurant|takeaway|braai|catering|cafe|coffee/)) return 'Restaurants & Takeaway'
  if (lower.match(/gift|hamper|present/)) return 'Gifts & Hampers'
  if (lower.match(/fashion|clothing|wear|apparel|dress/)) return 'Clothing & Fashion'
  if (lower.match(/beauty|health|wellness|spa|salon/)) return 'Beauty & Health'
  if (lower.match(/travel|tour|safari/)) return 'Travel & Tourism'
  return 'Food & Grocery'
}

async function searchBrave(query) {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=10&search_lang=en`
  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip',
      'X-Subscription-Token': BRAVE_API_KEY,
    }
  })

  if (!res.ok) {
    const text = await res.text()
    console.error(`  ⚠️  Brave API error ${res.status}: ${text.substring(0, 100)}`)
    return []
  }

  const data = await res.json()
  return data.web?.results ?? []
}

async function main() {
  console.log('🔍 SafferBiz Business Finder (powered by Brave Search)\n')
  console.log('Fetching existing listings from Supabase...')

  const { data: existing, error } = await supabase
    .from('listings')
    .select('business_name, website_url')

  if (error) {
    console.error('❌ Supabase error:', error.message)
    process.exit(1)
  }

  const existingUrls = new Set(
    (existing ?? [])
      .map((l) => l.website_url ? normaliseUrl(l.website_url) : null)
      .filter(Boolean)
  )
  const existingNames = new Set(
    (existing ?? []).map((l) => l.business_name?.toLowerCase().trim())
  )

  console.log(`✅ ${existing?.length ?? 0} existing listings loaded\n`)
  console.log(`🌍 Searching ${COUNTRIES_TO_SEARCH.length} countries × ${QUERY_TEMPLATES.length} queries = ${COUNTRIES_TO_SEARCH.length * QUERY_TEMPLATES.length} API calls\n`)

  const candidates = []
  const seenUrls = new Set()

  for (const country of COUNTRIES_TO_SEARCH) {
    console.log(`\n📍 ${country}`)

    for (const queryFn of QUERY_TEMPLATES) {
      const query = queryFn(country)
      const results = await searchBrave(query)
      console.log(`   "${query}" → ${results.length} results`)

      for (const item of results) {
        const url = item.url ?? ''
        const title = item.title ?? ''
        const snippet = item.description ?? ''
        const combined = `${title} ${snippet}`

        if (!isSARelated(combined)) continue
        if (shouldSkipUrl(url)) continue

        const normUrl = normaliseUrl(url)

        if (existingUrls.has(normUrl)) continue
        if (seenUrls.has(normUrl)) continue
        seenUrls.add(normUrl)

        if (existingNames.has(title.toLowerCase().trim())) continue

        candidates.push({
          business_name: title.replace(/\s*[-|].*$/, '').trim(),
          website_url: url,
          country,
          category: guessCategoryFromText(combined),
          description: snippet.replace(/\n/g, ' ').substring(0, 200),
          source_query: query,
        })
      }

      // Pause between requests
      await new Promise((r) => setTimeout(r, 1000))
    }
  }

  console.log(`\n\n🎉 Found ${candidates.length} potential new businesses not yet in SafferBiz!\n`)

  if (candidates.length === 0) {
    console.log('No candidates found — try adjusting the search queries or countries.')
    return
  }

  // Write CSV
  const headers = ['business_name', 'website_url', 'country', 'category', 'description', 'source_query']
  const rows = candidates.map((c) =>
    headers.map((h) => `"${String(c[h] ?? '').replace(/"/g, '""')}"`).join(',')
  )
  const csv = [headers.join(','), ...rows].join('\n')

  writeFileSync('candidates.csv', csv, 'utf8')

  console.log('📄 Saved to: candidates.csv')
  console.log('\nNext steps:')
  console.log('  1. Open candidates.csv in Excel or Google Sheets')
  console.log('  2. Review each row — delete ones that aren\'t real SA businesses')
  console.log('  3. Add good ones via the SafferBiz admin panel or submit form')
}

main().catch(console.error)
