/**
 * generate-coverage-infographic.mjs
 *
 * Builds a shareable "SafferBiz around the world" infographic (HTML) showing how
 * many businesses & events we have per country. Open the file in a browser and
 * screenshot the card (Windows Snipping Tool / Win+Shift+S) for social media.
 *
 * Usage:
 *   node scripts/generate-coverage-infographic.mjs
 *   → writes coverage-infographic.html in the project root
 */

import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

// Country → ISO code for flagcdn.com images (Windows-safe, unlike emoji flags)
const CODE = {
  'United States': 'us', 'United Kingdom': 'gb', 'New Zealand': 'nz', 'Australia': 'au',
  'Netherlands': 'nl', 'South Africa': 'za', 'Canada': 'ca', 'Germany': 'de', 'Ireland': 'ie',
  'United Arab Emirates': 'ae', 'Spain': 'es', 'Hong Kong': 'hk', 'France': 'fr', 'Mauritius': 'mu',
  'Greece': 'gr', 'Colombia': 'co', 'China': 'cn', 'Portugal': 'pt', 'South Korea': 'kr',
  'Luxembourg': 'lu', 'Thailand': 'th', 'Italy': 'it', 'Mexico': 'mx', 'Singapore': 'sg',
  'India': 'in', 'Israel': 'il', 'Poland': 'pl', 'Zimbabwe': 'zw',
}

// Names that aren't real countries — folded out of the per-country breakdown
const NON_COUNTRY = new Set(['Other', 'Unknown', ''])
// Normalise messy values
const normalise = (c) => {
  const t = (c || '').trim()
  if (t === 'USA' || t === 'United States of America') return 'United States'
  if (t === 'UK') return 'United Kingdom'
  return t
}

function tally(rows) {
  const m = {}
  for (const r of rows || []) {
    const c = normalise(r.country)
    if (NON_COUNTRY.has(c)) continue
    m[c] = (m[c] || 0) + 1
  }
  return m
}

const GREEN = '#007A4D'
const GOLD = '#FFB612'
const RED = '#DE3831'

async function main() {
  const today = new Date().toISOString().slice(0, 10)
  const [{ data: listings }, { data: allEvents }] = await Promise.all([
    supabase.from('listings').select('country').eq('status', 'active'),
    supabase.from('events').select('country, event_date, event_end_date').eq('status', 'active'),
  ])

  // Count only current & future events (matches the homepage stat)
  const events = (allEvents || []).filter((e) => (e.event_end_date || e.event_date) >= today)

  const biz = tally(listings)
  const ev = tally(events)
  const countries = [...new Set([...Object.keys(biz), ...Object.keys(ev)])]
  const totalOf = (c) => (biz[c] || 0) + (ev[c] || 0)
  countries.sort((a, b) => totalOf(b) - totalOf(a) || a.localeCompare(b))

  const totalBiz = Object.values(biz).reduce((a, b) => a + b, 0)
  const totalEv = Object.values(ev).reduce((a, b) => a + b, 0)
  const totalCountries = countries.length

  // Show countries with 2+ total as bars; collapse singletons into a flag strip
  const featured = countries.filter((c) => totalOf(c) >= 2)
  const tail = countries.filter((c) => totalOf(c) < 2)
  const maxTotal = Math.max(...featured.map(totalOf), 1)

  const flag = (c) => CODE[c]
    ? `<img src="https://flagcdn.com/w80/${CODE[c]}.png" width="34" height="23" alt="" style="border-radius:3px;box-shadow:0 0 0 1px rgba(0,0,0,.08);object-fit:cover;" />`
    : `<span style="display:inline-block;width:34px;text-align:center;">🌍</span>`

  const rows = featured.map((c) => {
    const b = biz[c] || 0, e = ev[c] || 0, t = b + e
    const pct = (t / maxTotal) * 100
    const bw = t ? (b / t) * 100 : 0
    return `
      <div style="display:flex;align-items:center;gap:14px;margin:0 0 14px;">
        <div style="flex:0 0 34px;">${flag(c)}</div>
        <div style="flex:0 0 180px;font-weight:600;font-size:19px;color:#1a1a1a;">${c}</div>
        <div style="flex:1;background:#f0f0f0;border-radius:8px;height:26px;overflow:hidden;display:flex;">
          <div style="width:${pct}%;display:flex;height:100%;">
            <div style="width:${bw}%;background:${GREEN};height:100%;"></div>
            <div style="width:${100 - bw}%;background:${RED};height:100%;"></div>
          </div>
        </div>
        <div style="flex:0 0 120px;text-align:right;font-size:15px;color:#555;">
          <strong style="color:${GREEN};">${b}</strong> biz${e ? ` · <strong style="color:${RED};">${e}</strong> ev` : ''}
        </div>
      </div>`
  }).join('')

  const tailStrip = tail.length ? `
    <div style="margin-top:18px;padding-top:18px;border-top:1px solid #eee;font-size:16px;color:#777;">
      <span style="font-weight:600;color:#555;">Also in:</span>
      ${tail.map((c) => `<span style="white-space:nowrap;display:inline-block;margin:4px 8px 0 0;">${flag(c)} ${c}</span>`).join('')}
    </div>` : ''

  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>SafferBiz coverage</title>
<style>body{margin:0;background:#e9eef0;font-family:'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;}</style>
</head>
<body>
  <p style="text-align:center;color:#888;font-size:14px;margin:20px;">↓ Screenshot the card below (Win+Shift+S) for Facebook / Instagram ↓</p>
  <div id="card" style="width:1080px;margin:0 auto 40px;background:#fff;border-radius:24px;overflow:hidden;box-shadow:0 12px 40px rgba(0,0,0,.12);">

    <!-- Header -->
    <div style="background:${GREEN};padding:40px 48px 34px;">
      <div style="font-size:30px;font-weight:800;color:#fff;letter-spacing:-.5px;">Saffer<span style="color:${GOLD};">Biz</span></div>
      <div style="font-size:44px;font-weight:800;color:#fff;margin-top:10px;line-height:1.1;">South Africans, all over the world 🌍</div>
      <div style="font-size:20px;color:rgba(255,255,255,.85);margin-top:8px;">SA-owned businesses & community events you can find on SafferBiz</div>
    </div>

    <!-- Stat tiles -->
    <div style="display:flex;gap:18px;padding:32px 48px 8px;">
      ${[['Businesses', totalBiz, GREEN], ['Events', totalEv, RED], ['Countries', totalCountries, GOLD]].map(([label, num, col]) => `
        <div style="flex:1;text-align:center;background:#fafafa;border:1px solid #eee;border-radius:16px;padding:22px 10px;">
          <div style="font-size:54px;font-weight:800;color:${col};line-height:1;">${num}</div>
          <div style="font-size:17px;color:#666;margin-top:8px;font-weight:600;">${label}</div>
        </div>`).join('')}
    </div>

    <!-- Legend -->
    <div style="padding:14px 48px 4px;font-size:15px;color:#777;">
      <span style="display:inline-block;width:13px;height:13px;background:${GREEN};border-radius:3px;vertical-align:-1px;"></span> Businesses
      &nbsp;&nbsp;
      <span style="display:inline-block;width:13px;height:13px;background:${RED};border-radius:3px;vertical-align:-1px;"></span> Events
    </div>

    <!-- Per-country bars -->
    <div style="padding:18px 48px 8px;">${rows}</div>

    <!-- Tail -->
    <div style="padding:0 48px;">${tailStrip}</div>

    <!-- Footer -->
    <div style="margin-top:28px;padding:22px 48px;background:#1a1a1a;display:flex;justify-content:space-between;align-items:center;">
      <div style="font-size:22px;font-weight:700;color:#fff;">Find them all at <span style="color:${GOLD};">safferbiz.com</span></div>
      <div style="display:flex;height:10px;border-radius:5px;overflow:hidden;width:180px;">
        <div style="flex:1;background:${RED};"></div><div style="flex:1;background:#fff;"></div>
        <div style="flex:1;background:${GREEN};"></div><div style="flex:1;background:${GOLD};"></div>
        <div style="flex:1;background:#002395;"></div><div style="flex:1;background:#000;"></div>
      </div>
    </div>

  </div>
</body></html>`

  writeFileSync('coverage-infographic.html', html)
  console.log('✅  Wrote coverage-infographic.html')
  console.log(`    ${totalBiz} businesses · ${totalEv} events · ${totalCountries} countries`)
  console.log(`    Featured ${featured.length} countries with bars, ${tail.length} in the "Also in" strip.`)
  console.log('\n    Open it:  start coverage-infographic.html')
  console.log('    Then screenshot the white card (Win+Shift+S).')
}

main().catch((e) => { console.error(e); process.exit(1) })
