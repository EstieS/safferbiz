/**
 * Geocodes all listings that have a city but no lat/lng yet.
 * Uses OpenStreetMap Nominatim (free, no API key needed).
 * Rate limited to 1 request/second as required by Nominatim ToS.
 *
 * Run with: node scripts/geocode-listings.mjs
 */

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function geocode(city, country) {
  const query = encodeURIComponent(`${city}, ${country}`)
  const url = `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'SafferBiz/1.0 (safferbiz.vercel.app)',
    },
  })

  if (!res.ok) {
    console.error(`  HTTP ${res.status} for "${city}, ${country}"`)
    return null
  }

  const data = await res.json()
  if (data.length === 0) {
    console.warn(`  No result for "${city}, ${country}"`)
    return null
  }

  return {
    latitude: parseFloat(data[0].lat),
    longitude: parseFloat(data[0].lon),
  }
}

async function main() {
  // Fetch all listings with a city but no coordinates yet
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, business_name, city, country, latitude')
    .not('city', 'is', null)
    .is('latitude', null)
    .eq('status', 'active')

  if (error) {
    console.error('Failed to fetch listings:', error.message)
    process.exit(1)
  }

  console.log(`Found ${listings.length} listings to geocode...\n`)

  let success = 0
  let failed = 0

  for (const listing of listings) {
    process.stdout.write(`[${success + failed + 1}/${listings.length}] ${listing.business_name} (${listing.city}, ${listing.country})... `)

    const coords = await geocode(listing.city, listing.country)

    if (coords) {
      const { error: updateError } = await supabase
        .from('listings')
        .update(coords)
        .eq('id', listing.id)

      if (updateError) {
        console.log(`SAVE ERROR: ${updateError.message}`)
        failed++
      } else {
        console.log(`✓ (${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)})`)
        success++
      }
    } else {
      failed++
    }

    // Nominatim requires 1 second between requests
    await sleep(1100)
  }

  console.log(`\nDone! ${success} geocoded, ${failed} failed.`)
}

main()
