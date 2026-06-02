/**
 * post-top-businesses.mjs
 *
 * Fetches the top 3 most-viewed active businesses, drafts FB + IG posts
 * via Claude Haiku, and emails the drafts to admin ready to copy-paste.
 *
 * Usage:
 *   node scripts/post-top-businesses.mjs            → generates and emails drafts
 *   node scripts/post-top-businesses.mjs --dry-run  → prints to console, no email sent
 *   node scripts/post-top-businesses.mjs --top=5    → top 5 instead of 3
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const SENDGRID_KEY  = process.env.SENDGRID_API_KEY
const FROM_EMAIL    = process.env.SENDGRID_FROM_EMAIL ?? 'admin@safferbiz.com'
const ADMIN_EMAIL   = 'safferbiz@gmail.com'
const SITE          = 'https://safferbiz.com'

const args    = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const TOP_N   = parseInt(args.find(a => a.startsWith('--top='))?.split('=')[1] ?? '3')

// ─── Validate ─────────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_KEY) { console.error('❌  Missing Supabase env vars'); process.exit(1) }
if (!ANTHROPIC_KEY)                  { console.error('❌  Missing ANTHROPIC_API_KEY'); process.exit(1) }
if (!SENDGRID_KEY && !DRY_RUN)       { console.error('❌  Missing SENDGRID_API_KEY'); process.exit(1) }

// ─── Init ─────────────────────────────────────────────────────────────────────

const supabase  = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
if (!DRY_RUN) sgMail.setApiKey(SENDGRID_KEY)

// ─── Fetch top businesses ─────────────────────────────────────────────────────

async function fetchTopBusinesses(n) {
  const { data, error } = await supabase
    .from('listings')
    .select('id, business_name, slug, description, category, city, state, country, tags, sells_online, view_count, click_count')
    .eq('status', 'active')
    .order('view_count', { ascending: false })
    .limit(n)

  if (error) { console.error('❌  Supabase error:', error.message); process.exit(1) }
  return data ?? []
}

// ─── Generate post via Claude ─────────────────────────────────────────────────

async function generatePost(businesses) {
  const listText = businesses.map((b, i) => {
    const location = [b.city, b.state, b.country].filter(Boolean).join(', ')
    const tags = (b.tags ?? []).slice(0, 4).join(', ')
    return [
      `${i + 1}. ${b.business_name} — ${location}`,
      `   Category: ${b.category}`,
      tags ? `   Products: ${tags}` : '',
      b.description ? `   About: ${b.description.slice(0, 120)}` : '',
      `   Views: ${b.view_count.toLocaleString()}`,
      `   Link: ${SITE}/listings/${b.slug}`,
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  const prompt = `You write social media posts for SafferBiz — a directory of South African-owned businesses worldwide, built for SA expats.

Write TWO versions of a "most popular this month" style post celebrating the top ${businesses.length} most-viewed businesses on the platform:

1. A Facebook post (warm, community-spirited, 2–4 short paragraphs, a few emojis)
2. An Instagram caption (punchy, 4–6 lines + 10 relevant hashtags)

Top ${businesses.length} businesses by views:
${listText}

Guidelines:
- Make it feel celebratory — these businesses are loved by the SA expat community
- Mention each business by name and where they're based
- Encourage people to check them out
- DO NOT include any URLs or links in the posts — the links will go in the first comment
- End Facebook post with "Links to all three in the first comment 👇" (or equivalent for the number)
- End Instagram with "Links in bio 🔗"
- Facebook: ~120–160 words
- Instagram: ~60–80 words before hashtags
- Hashtags should include #SafferBiz #SAExpat #SouthAfrican and relevant product/location tags

Format exactly like this:
--- FACEBOOK ---
[post here]

--- INSTAGRAM ---
[caption here]`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 700,
    messages: [{ role: 'user', content: prompt }],
  })

  const raw = message.content[0].text
  const fbMatch  = raw.match(/--- FACEBOOK ---\s*([\s\S]*?)(?=--- INSTAGRAM ---|$)/)
  const igMatch  = raw.match(/--- INSTAGRAM ---\s*([\s\S]*?)$/)

  return {
    facebook:  fbMatch?.[1]?.trim() ?? raw,
    instagram: igMatch?.[1]?.trim() ?? '',
  }
}

// ─── Email ────────────────────────────────────────────────────────────────────

function buildEmail(businesses, facebook, instagram) {
  const links = businesses.map(b =>
    `<li><a href="${SITE}/listings/${b.slug}" style="color:#007A4D;">${b.business_name}</a> — ${b.view_count.toLocaleString()} views</li>`
  ).join('')

  const firstCommentLinks = businesses.map(b =>
    `${SITE}/listings/${b.slug}`
  ).join('\n')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #007A4D; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">🏆 Top ${businesses.length} Most Viewed — Social Post Draft</p>
      </div>
      <div style="padding: 32px 24px;">

        <div style="background: #f9f9f9; border-left: 4px solid #FFB612; padding: 14px 16px; border-radius: 4px; margin-bottom: 24px;">
          <p style="margin: 0 0 8px; font-weight: bold; font-size: 13px; color: #555;">🏆 This month's top ${businesses.length}:</p>
          <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #333; line-height: 2;">${links}</ol>
        </div>

        <div style="background: #fffbea; border: 1.5px solid #f5c842; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #7a6000;">💡 How to post for best reach</p>
          <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.8;">
            <li>Add an eye-catching image (collage of all three businesses works great)</li>
            <li>Paste the post copy below — <strong>no links in the post itself</strong></li>
            <li>After posting, add the first comment with these links:<br/>
              <div style="margin-top:6px; background:#f0f0f0; padding: 8px 12px; border-radius:4px; font-family: monospace; font-size: 12px; color: #333; white-space: pre-line;">${firstCommentLinks}</div>
            </li>
          </ol>
        </div>

        <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #1877F2;">📘 FACEBOOK</p>
        <div style="background: #f0f4ff; border-left: 3px solid #1877F2; padding: 14px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px;">${facebook}</div>

        <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #E1306C;">📸 INSTAGRAM</p>
        <div style="background: #fff0f6; border-left: 3px solid #E1306C; padding: 14px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6;">${instagram}</div>

        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          Generated by SafferBiz · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  `
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍  DRY RUN\n' : `🏆  Generating top ${TOP_N} businesses post...\n`)

  const businesses = await fetchTopBusinesses(TOP_N)

  if (businesses.length === 0) {
    console.log('ℹ️  No active businesses found.')
    return
  }

  console.log(`Top ${businesses.length} by views:`)
  businesses.forEach((b, i) => {
    const location = [b.city, b.country].filter(Boolean).join(', ')
    console.log(`  ${i + 1}. ${b.business_name} (${location}) — 👁 ${b.view_count.toLocaleString()} views`)
  })
  console.log()

  console.log('✍️  Generating post drafts...')
  const { facebook, instagram } = await generatePost(businesses)

  if (DRY_RUN) {
    console.log('\n--- FACEBOOK ---')
    console.log(facebook)
    console.log('\n--- INSTAGRAM ---')
    console.log(instagram)
    console.log('\n✅  Dry run complete — no email sent.')
    return
  }

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: { email: FROM_EMAIL, name: 'SafferBiz' },
    subject: `🏆 Top ${TOP_N} most-viewed businesses — post draft ready`,
    html: buildEmail(businesses, facebook, instagram),
  })

  console.log(`✅  Draft emailed to ${ADMIN_EMAIL}`)
}

main().catch(err => { console.error('Unexpected error:', err); process.exit(1) })
