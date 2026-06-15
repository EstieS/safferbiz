/**
 * spotlight-business.mjs  —  "Meet the Maker" weekly business spotlight
 *
 * Picks a few SA businesses (verified first, never-/least-recently-featured),
 * reads their own website + a Tavily search for real backstory, and asks Claude
 * to pull a GENUINE, specific tidbit and write a warm Facebook spotlight post.
 *
 * Hard rule: it only uses facts found in the source. If a business has nothing
 * genuinely interesting/credible to say, it is SKIPPED — never fabricated.
 *
 * Emails you the best drafts to review and post (link in first comment).
 *
 * Usage:
 *   node scripts/spotlight-business.mjs --dry-run         # preview, no email, no DB marks
 *   node scripts/spotlight-business.mjs                   # email drafts + mark featured
 *   node scripts/spotlight-business.mjs --count=2         # how many drafts to produce (default 3)
 *   node scripts/spotlight-business.mjs --business="Name" # spotlight one specific business
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const TAVILY_KEY    = process.env.TAVILY_API_KEY
const SENDGRID_KEY  = process.env.SENDGRID_API_KEY
const FROM_EMAIL    = process.env.SENDGRID_FROM_EMAIL ?? 'admin@safferbiz.com'
const ADMIN_EMAIL   = 'safferbiz@gmail.com'
const SITE          = 'https://safferbiz.com'

const args      = process.argv.slice(2)
const DRY_RUN   = args.includes('--dry-run')
const COUNT     = parseInt(args.find(a => a.startsWith('--count='))?.split('=')[1] ?? '3')
const ONLY_BIZ  = args.find(a => a.startsWith('--business='))?.split('=').slice(1).join('=').replace(/^["']|["']$/g, '') ?? null
const POOL_SIZE = 14 // top candidates to consider before researching

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  Missing Supabase env vars'); process.exit(1) }
if (!ANTHROPIC_KEY) { console.error('❌  Missing ANTHROPIC_API_KEY'); process.exit(1) }

const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } })
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
const sleep = (ms) => new Promise(r => setTimeout(r, ms))

// ─── Candidate selection ──────────────────────────────────────────────────────
async function selectCandidates() {
  const { data, error } = await supabase
    .from('listings')
    .select('id, business_name, slug, description, category, city, country, website_url, is_verified, last_featured_at')
    .eq('status', 'active')
    .not('website_url', 'is', null)
    .neq('website_url', '')
  if (error) { console.error('❌  Supabase error:', error.message); process.exit(1) }

  let rows = data ?? []
  if (ONLY_BIZ) {
    rows = rows.filter(r => r.business_name.toLowerCase().includes(ONLY_BIZ.toLowerCase()))
    return rows
  }

  // Verified first, then never-featured, then least-recently-featured
  rows.sort((a, b) => {
    if (a.is_verified !== b.is_verified) return a.is_verified ? -1 : 1
    const ta = a.last_featured_at ? new Date(a.last_featured_at).getTime() : 0
    const tb = b.last_featured_at ? new Date(b.last_featured_at).getTime() : 0
    return ta - tb
  })

  // Shuffle the top tier so it's not the same order every week
  const pool = rows.slice(0, POOL_SIZE)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool
}

// ─── Gather real source material ──────────────────────────────────────────────
function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function ensureHttps(url) {
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

async function fetchSite(url) {
  const base = ensureHttps(url).replace(/\/$/, '')
  const targets = [base, `${base}/about`, `${base}/about-us`, `${base}/our-story`]
  let text = ''
  for (const t of targets) {
    try {
      const res = await fetch(t, {
        headers: { 'User-Agent': 'Mozilla/5.0 (SafferBiz spotlight bot)' },
        signal: AbortSignal.timeout(12000),
      })
      if (res.ok) {
        const html = await res.text()
        text += ' ' + stripHtml(html).slice(0, 2500)
      }
    } catch { /* best-effort — ignore unreachable pages */ }
    if (text.length > 3500) break
  }
  return text.slice(0, 4000)
}

async function tavilyContext(biz) {
  if (!TAVILY_KEY) return ''
  try {
    const q = `"${biz.business_name}" ${biz.city || ''} ${biz.country} South African business story founder about`
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: TAVILY_KEY, query: q, search_depth: 'basic', max_results: 4 }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    return (data.results ?? []).map(r => (r.content ?? '').slice(0, 400)).join('\n')
  } catch { return '' }
}

// ─── Draft via Claude (strictly grounded in the source) ──────────────────────
async function draftSpotlight(biz, source) {
  const location = [biz.city, biz.country].filter(Boolean).join(', ')
  const prompt = `You write the "Meet the Maker" business spotlight for SafferBiz — a directory of South African-owned businesses worldwide, for SA expats. Tone: warm, genuine, community-spirited, a little witty. NOT corporate.

Business: ${biz.business_name} (${location}) — ${biz.category}
Listing blurb: ${biz.description || '(none)'}

SOURCE MATERIAL (from their own website + web search):
"""
${source || '(no source material found)'}
"""

CRITICAL RULES:
- Use ONLY facts that genuinely appear in the SOURCE MATERIAL above. Do NOT invent, assume, or embellish a backstory.
- Find ONE specific, interesting, verifiable tidbit (e.g. founding year, a family/origin story, what makes them unusual, an award, a signature product).
- If the source has NOTHING genuinely interesting or specific (just generic marketing, or empty), you MUST skip it.

Return ONLY a JSON object, nothing else:
- If you found a real tidbit:
  {"skip": false, "tidbit": "<the specific fact, one line>", "facebook_post": "<the post>"}
- If not:
  {"skip": true, "reason": "<short why>"}

The facebook_post should be: 90-140 words, 2-3 short paragraphs, a few tasteful emojis, lead with the human/interesting angle, mention what they sell and where they're based, and END with "Find them on SafferBiz — link in the first comment 👇". Do NOT put any URL in the post.`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  })
  try {
    const raw = message.content[0].text.trim()
    const match = raw.match(/\{[\s\S]*\}/)
    return match ? JSON.parse(match[0]) : { skip: true, reason: 'unparseable' }
  } catch {
    return { skip: true, reason: 'parse error' }
  }
}

// ─── Email ────────────────────────────────────────────────────────────────────
async function emailDrafts(drafts) {
  const cards = drafts.map((d, i) => `
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:18px;margin-bottom:18px;">
      <p style="margin:0 0 4px;font-size:13px;color:#888;">Option ${i + 1}</p>
      <h2 style="margin:0 0 2px;font-size:18px;color:#111;">${d.business_name}</h2>
      <p style="margin:0 0 10px;font-size:13px;color:#007A4D;">${d.location} · <a href="${SITE}/listings/${d.slug}" style="color:#007A4D;">View listing</a></p>
      <p style="margin:0 0 10px;font-size:13px;color:#7a6000;background:#fffbea;border:1px solid #f5c842;border-radius:6px;padding:8px 10px;"><strong>💡 Angle:</strong> ${d.tidbit}</p>
      <div style="background:#f0f4ff;border-left:3px solid #1877F2;padding:12px 14px;border-radius:4px;font-size:14px;color:#333;white-space:pre-wrap;line-height:1.6;">${d.facebook_post}</div>
      <p style="margin:10px 0 0;font-size:12px;color:#555;">First comment link: <span style="font-family:monospace;background:#f0f0f0;padding:2px 6px;border-radius:3px;">${SITE}/listings/${d.slug}</span></p>
    </div>`).join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto;">
      <div style="background:#007A4D;padding:24px;text-align:center;">
        <h1 style="color:white;margin:0;font-size:24px;">Saffer<span style="color:#FFB612;">Biz</span></h1>
        <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:14px;">🤝 Meet the Maker — spotlight drafts</p>
      </div>
      <div style="padding:28px 24px;">
        <p style="color:#555;margin:0 0 6px;">Here ${drafts.length === 1 ? 'is this week’s spotlight draft' : `are ${drafts.length} spotlight drafts`} — each based only on real info from the business's own site. Pick your favourite, post the image + copy, and drop the link in the first comment.</p>
        <div style="background:#fffbea;border:1.5px solid #f5c842;border-radius:8px;padding:12px 14px;margin:14px 0 20px;font-size:13px;color:#7a6000;">
          💡 Reminder: post copy first (no link), then add the listing link as the <strong>first comment</strong> for best reach.
        </div>
        ${cards}
        <p style="margin-top:8px;font-size:12px;color:#999;">Generated by SafferBiz · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
      </div>
    </div>`

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${SENDGRID_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: ADMIN_EMAIL }] }],
      from: { email: FROM_EMAIL, name: 'SafferBiz' },
      subject: `🤝 Meet the Maker — ${drafts.length} spotlight draft${drafts.length > 1 ? 's' : ''} ready`,
      content: [{ type: 'text/html', value: html }],
    }),
  })
  if (!res.ok) console.error('   ⚠️  Email send failed:', res.status, await res.text())
  else console.log(`📧  Drafts emailed → ${ADMIN_EMAIL}`)
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(DRY_RUN ? '🔍  DRY RUN — no email, no DB marks\n' : '🤝  Meet the Maker — generating spotlight...\n')

  const candidates = await selectCandidates()
  if (candidates.length === 0) { console.log('ℹ️  No candidates with a website found.'); return }

  const drafts = []
  for (const biz of candidates) {
    if (drafts.length >= COUNT) break
    console.log(`🔎  Researching ${biz.business_name}${biz.is_verified ? ' ✓' : ''}...`)
    const [site, tav] = await Promise.all([fetchSite(biz.website_url), tavilyContext(biz)])
    const source = [site, tav].filter(Boolean).join('\n\n')
    if (source.replace(/\s/g, '').length < 80) { console.log('   ↳ thin source, skipping'); continue }

    const result = await draftSpotlight(biz, source)
    if (result.skip) { console.log(`   ↳ skipped (${result.reason || 'no strong angle'})`); await sleep(400); continue }

    const location = [biz.city, biz.country].filter(Boolean).join(', ')
    drafts.push({ ...biz, location, tidbit: result.tidbit, facebook_post: result.facebook_post })
    console.log(`   ✅ draft ready — "${result.tidbit}"`)
    await sleep(400)
  }

  if (drafts.length === 0) {
    console.log('\nℹ️  No strong spotlight material found this run. Nothing sent.')
    return
  }

  if (DRY_RUN) {
    drafts.forEach((d, i) => {
      console.log(`\n──────── Option ${i + 1}: ${d.business_name} (${d.location}) ────────`)
      console.log(`💡 ${d.tidbit}\n`)
      console.log(d.facebook_post)
    })
    console.log('\n✅  Dry run complete — no email sent.')
    return
  }

  await emailDrafts(drafts)
  // Mark drafted businesses as featured so they rotate out for a while
  const now = new Date().toISOString()
  await supabase.from('listings').update({ last_featured_at: now }).in('id', drafts.map(d => d.id))
  console.log(`\n✅  Done — ${drafts.length} draft(s) sent, marked as featured.`)
}

main().catch(e => { console.error('Unexpected error:', e); process.exit(1) })
