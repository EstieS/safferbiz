import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse'
import { createReadStream } from 'fs'

const SUPABASE_URL = 'https://mncaepsshphhxaojlrwv.supabase.co'
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1uY2FlcHNzaHBoaHhhb2pscnd2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzU4MzIwMywiZXhwIjoyMDkzMTU5MjAzfQ.MfFPa7R6eVBhoD1_62vADafLOMRSZn86NL2gk-xN5pg'
const CSV_PATH = 'C:/Users/estie/Downloads/export_All-AllBusinesses-modified--_2026-05-01_00-36-58.csv'

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const TYPE_TO_CATEGORY = {
  'Restaurants': 'Restaurants & Takeaway',
  'Food Stores (online)': 'Food & Grocery',
  'Food Stores (physical)': 'Food & Grocery',
  'Specialty Stores': 'Gifts & Hampers',
  'Jewelry & Accessories': 'Clothing & Fashion',
  'Archery': 'Services',
  'Insurance': 'Services',
  'Accountants/Tax Advisors': 'Services',
  'Auto Mechanics': 'Services',
  'Real Estate Agents': 'Services',
  'Hairdressers/Barbers': 'Beauty & Health',
  'Coaching': 'Beauty & Health',
  'Doctors/Clinics': 'Beauty & Health',
  'Home Health': 'Beauty & Health',
  'Dentists': 'Beauty & Health',
  'Painters & Renovators': 'Services',
  'Recruiters': 'Services',
  'Printing & Signage': 'Services',
  'Immigration': 'Services',
  'Local Events': 'SKIP',
}

const COUNTRY_MAP = {
  'USA': 'United States',
  'UK': 'United Kingdom',
  'UAE': 'United Arab Emirates',
}

function normalizeCountry(c) {
  return COUNTRY_MAP[c?.trim()] ?? c?.trim() ?? 'Other'
}

function extractCity(address) {
  if (!address) return null
  const parts = address.split(',').map(p => p.trim()).filter(Boolean)
  if (parts.length < 2) return null

  // Single-word country/state entries like "United States", "Florida, USA" → no city
  const countries = ['United States', 'USA', 'United Kingdom', 'UK', 'Canada', 'Australia',
    'New Zealand', 'Germany', 'Netherlands', 'Ireland', 'Singapore', 'South Africa',
    'France', 'Spain', 'Portugal', 'Greece', 'Thailand', 'Colombia', 'Mauritius',
    'Hong Kong', 'South Korea', 'Luxembourg', 'China', 'UAE', 'United Arab Emirates']
  const states = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN',
    'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
    'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA',
    'WA','WV','WI','WY','DC']

  // If first part is just a country name, skip
  if (countries.includes(parts[0])) return null

  // "City, ST, Country" or "City, ST ZIP, Country"
  const candidate = parts.length >= 3 ? parts[1] : parts[0]
  // Strip postal codes and state abbreviations
  const cleaned = candidate
    .replace(/\b[A-Z]{2,3}\s*\d{3,6}.*$/, '')
    .replace(/\bBC\b|\bON\b|\bAB\b|\bMB\b|\bQC\b|\bNS\b/g, '')
    .replace(/\bNSW\b|\bVIC\b|\bQLD\b|\bWA\b|\bSA\b|\bTAS\b/g, '')
    .trim()
    .replace(/,$/, '')
    .trim()

  // Skip if it looks like a state abbreviation only or empty
  if (!cleaned || cleaned.length <= 1 || states.includes(cleaned)) return null

  return cleaned || null
}

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80)
}

async function generateUniqueSlug(baseName, existingSlugs) {
  let slug = slugify(baseName)
  let counter = 1
  while (existingSlugs.has(slug)) {
    slug = `${slugify(baseName)}-${counter++}`
  }
  existingSlugs.add(slug)
  return slug
}

async function main() {
  console.log('Starting import...\n')

  // Load existing slugs to avoid conflicts
  const { data: existing } = await supabase.from('listings').select('slug')
  const existingSlugs = new Set((existing ?? []).map(r => r.slug))

  const records = []
  await new Promise((resolve, reject) => {
    createReadStream(CSV_PATH)
      .pipe(parse({ columns: true, skip_empty_lines: true, relax_quotes: true, relax_column_count: true }))
      .on('data', row => records.push(row))
      .on('end', resolve)
      .on('error', reject)
  })

  console.log(`Parsed ${records.length} rows from CSV\n`)

  let imported = 0
  let skipped = 0
  let errors = 0

  for (const row of records) {
    const type = row['Type']?.trim()
    const category = TYPE_TO_CATEGORY[type]

    if (!category || category === 'SKIP') {
      console.log(`SKIP [${type}]: ${row['Name']}`)
      skipped++
      continue
    }

    const name = row['Name']?.trim()
    if (!name) { skipped++; continue }

    const country = normalizeCountry(row['Country'])
    const city = extractCity(row['Address'])
    const slug = await generateUniqueSlug(name, existingSlugs)

    const listing = {
      business_name: name,
      slug,
      description: row['Description']?.trim() || null,
      category,
      country,
      city,
      website_url: row['Website']?.trim() || null,
      facebook_url: row['Facebook']?.trim() || null,
      instagram_url: row['Instagram']?.trim() || null,
      email: row['Email']?.trim() || null,
      status: 'active',
    }

    const { error } = await supabase.from('listings').insert(listing)
    if (error) {
      console.error(`ERROR: ${name} — ${error.message}`)
      errors++
    } else {
      console.log(`OK: ${name} (${country}${city ? ', ' + city : ''}) → ${category}`)
      imported++
    }
  }

  console.log(`\n✅ Import complete`)
  console.log(`   Imported: ${imported}`)
  console.log(`   Skipped:  ${skipped}`)
  console.log(`   Errors:   ${errors}`)
}

main().catch(console.error)
