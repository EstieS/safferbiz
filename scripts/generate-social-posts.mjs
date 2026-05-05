/**
 * generate-social-posts.mjs
 *
 * Pulls listings marked feature_on_social = true from Supabase,
 * uses Claude AI to write engaging social media draft posts,
 * and emails a batch to Estie for review.
 *
 * Usage: node scripts/generate-social-posts.mjs
 *
 * Optional flags:
 *   --dry-run    Generate posts but don't send the email (prints to console)
 *   --limit=5    Only process N listings (default: all unprocessed)
 *
 * Cost estimate: ~$0.0004 per post using Claude Haiku
 * $5 in credits ≈ 12,500 posts — basically free
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'
import sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'admin@safferbiz.com'
const ADMIN_EMAIL = 'safferbiz@gmail.com'
const SITE = 'https://safferbiz.com'

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null

// ─── Validate env ─────────────────────────────────────────────────────────────

const missing = []
if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
if (!ANTHROPIC_KEY) missing.push('ANTHROPIC_API_KEY')
if (!SENDGRID_KEY && !DRY_RUN) missing.push('SENDGRID_API_KEY')

if (missing.length) {
  console.error(`❌ Missing env vars: ${missing.join(', ')}`)
  console.error('   Add them to .env.local and try again.')
  process.exit(1)
}

// ─── Clients ──────────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_KEY })
if (!DRY_RUN) sgMail.setApiKey(SENDGRID_KEY)

// ─── Generate post for one listing ────────────────────────────────────────────

async function generatePost(listing) {
  const location = [listing.city, listing.state, listing.country].filter(Boolean).join(', ')
  const tags = (listing.tags ?? []).slice(0, 6).join(', ')
  const websiteLine = listing.website_url ? `Website: ${listing.website_url}` : ''
  const onlineLine = listing.sells_online ? 'Ships/delivers online ✅' : ''

  const prompt = `You write social media posts for SafferBiz — a directory of South African-owned businesses around the world, for SA expats to find a taste of home.

Write TWO versions of a social media post featuring this business:
1. A Facebook post (2–3 short paragraphs, warm and community-focused, can use a couple of emojis)
2. An Instagram caption (punchy, 3–5 lines + 8–10 relevant hashtags at the end)

Business details:
- Name: ${listing.business_name}
- Location: ${location}
- Category: ${listing.category}
- Description: ${listing.description ?? 'No description provided'}
${tags ? `- Products/Services: ${tags}` : ''}
${onlineLine}
${websiteLine}

Listing URL: ${SITE}/listings/${listing.slug}

Guidelines:
- Write in a friendly, community-spirited tone — like you're telling a fellow SA expat about a great find
- Mention the location so local expats know it's near them
- Include the listing URL so people can find it easily
- Don't make up details that aren't in the description
- Keep it authentic, not overly salesy
- Facebook post: ~80–120 words
- Instagram caption: ~40–60 words + hashtags

Format your response exactly like this:
--- FACEBOOK ---
[facebook post here]

--- INSTAGRAM ---
[instagram caption here]`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].text
}

// ─── Parse the AI response into FB + IG sections ─────────────────────────────

function parsePost(raw) {
  const fbMatch = raw.match(/--- FACEBOOK ---\s*([\s\S]*?)(?=--- INSTAGRAM ---|$)/)
  const igMatch = raw.match(/--- INSTAGRAM ---\s*([\s\S]*?)$/)
  return {
    facebook: fbMatch?.[1]?.trim() ?? raw,
    instagram: igMatch?.[1]?.trim() ?? '',
  }
}

// ─── Build the summary email HTML ─────────────────────────────────────────────

function buildEmailHtml(posts) {
  const postBlocks = posts.map(({ listing, facebook, instagram }, i) => {
    const location = [listing.city, listing.state, listing.country].filter(Boolean).join(', ')
    return `
      <div style="margin-bottom: 48px; border-top: 2px solid #e5e7eb; padding-top: 32px;">
        <h2 style="margin: 0 0 4px; color: #111; font-size: 18px;">${i + 1}. ${listing.business_name}</h2>
        <p style="margin: 0 0 20px; color: #007A4D; font-size: 13px;">
          📍 ${location} &nbsp;·&nbsp; ${listing.category} &nbsp;·&nbsp;
          <a href="${SITE}/listings/${listing.slug}" style="color: #007A4D;">View listing →</a>
        </p>

        <div style="margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #1877F2;">📘 FACEBOOK</p>
          <div style="background: #f0f4ff; border-left: 3px solid #1877F2; padding: 14px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6;">${facebook}</div>
        </div>

        <div>
          <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #E1306C;">📸 INSTAGRAM</p>
          <div style="background: #fff0f6; border-left: 3px solid #E1306C; padding: 14px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6;">${instagram}</div>
        </div>
      </div>
    `
  }).join('')

  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #007A4D; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Social Media Draft Posts</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #555; margin-top: 0;">Hi Estie,</p>
        <p style="color: #555;">Here are <strong>${posts.length} draft social media post${posts.length > 1 ? 's' : ''}</strong> for your featured listings. Review, edit as you like, and post when ready! 🎉</p>

        ${postBlocks}

        <p style="color: #999; font-size: 12px; margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
          Generated by SafferBiz Social Post Agent · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  `
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`\n🇿🇦 SafferBiz Social Post Generator`)
  console.log(`   ${DRY_RUN ? '(DRY RUN — no email will be sent)' : 'Will email drafts to ' + ADMIN_EMAIL}\n`)

  // Fetch featured listings
  let query = supabase
    .from('listings')
    .select('id, business_name, slug, description, category, country, city, state, website_url, tags, sells_online')
    .eq('feature_on_social', true)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (LIMIT) query = query.limit(LIMIT)

  const { data: listings, error } = await query

  if (error) {
    console.error('❌ Failed to fetch listings:', error.message)
    process.exit(1)
  }

  if (!listings?.length) {
    console.log('ℹ️  No listings with feature_on_social = true found.')
    console.log('   Go to the admin panel and toggle the social feature flag on some listings first.')
    process.exit(0)
  }

  console.log(`✅ Found ${listings.length} listing${listings.length > 1 ? 's' : ''} to feature\n`)

  // Generate posts
  const results = []
  let successCount = 0
  let errorCount = 0

  for (const listing of listings) {
    process.stdout.write(`   Generating post for "${listing.business_name}"... `)
    try {
      const raw = await generatePost(listing)
      const { facebook, instagram } = parsePost(raw)
      results.push({ listing, facebook, instagram })
      successCount++
      console.log('✅')

      if (DRY_RUN) {
        console.log(`\n${'─'.repeat(60)}`)
        console.log(`📘 FACEBOOK — ${listing.business_name}`)
        console.log(`${'─'.repeat(60)}`)
        console.log(facebook)
        console.log(`\n📸 INSTAGRAM`)
        console.log(`${'─'.repeat(60)}`)
        console.log(instagram)
        console.log()
      }

      // Small delay to be kind to the API
      await new Promise(r => setTimeout(r, 500))
    } catch (err) {
      console.log('❌')
      console.error(`   Error: ${err.message}`)
      errorCount++
    }
  }

  console.log(`\n📊 Results: ${successCount} generated, ${errorCount} failed`)

  if (results.length === 0) {
    console.log('❌ No posts generated — nothing to send.')
    process.exit(1)
  }

  // Send email
  if (DRY_RUN) {
    console.log('\n✅ Dry run complete — posts printed above.')
    return
  }

  console.log(`\n📧 Sending ${results.length} draft posts to ${ADMIN_EMAIL}...`)

  try {
    await sgMail.send({
      to: ADMIN_EMAIL,
      from: { email: FROM_EMAIL, name: 'SafferBiz' },
      subject: `📱 ${results.length} social media draft${results.length > 1 ? 's' : ''} ready for review`,
      html: buildEmailHtml(results),
    })
    console.log('✅ Email sent!')
  } catch (err) {
    console.error('❌ Failed to send email:', err.message)
    console.log('\n💡 To preview posts without sending, run with --dry-run flag')
    process.exit(1)
  }

  console.log('\n🎉 Done!\n')
}

main()
