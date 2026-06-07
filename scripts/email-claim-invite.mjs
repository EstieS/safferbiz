/**
 * email-claim-invite.mjs
 *
 * One-time campaign: emails the owner of every ACTIVE listing that has a contact
 * email and hasn't been claimed yet, inviting them to claim their business —
 * which gives them a ✓ Verified badge and the ability to manage their own listing.
 *
 * Usage:
 *   node scripts/email-claim-invite.mjs --dry-run        → preview only, no emails sent (START HERE)
 *   node scripts/email-claim-invite.mjs --test=you@x.com → send ONE sample email to you, then stop (preview in your inbox)
 *   node scripts/email-claim-invite.mjs --limit=1        → send to just the first real recipient
 *   node scripts/email-claim-invite.mjs --only=biz@x.com → send only to the listing(s) with this exact email
 *   node scripts/email-claim-invite.mjs                  → send to everyone for real
 */

import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL   = process.env.SENDGRID_FROM_EMAIL ?? 'admin@safferbiz.com'
const SITE         = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://safferbiz.com'

const DRY_RUN = process.argv.includes('--dry-run')
const LIMIT   = parseInt(process.argv.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '0') || null
const ONLY    = process.argv.find(a => a.startsWith('--only='))?.split('=')[1]?.toLowerCase() ?? null
const TEST    = process.argv.find(a => a.startsWith('--test='))?.split('=')[1] ?? null

// ─── Validate env ─────────────────────────────────────────────────────────────

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
if (!SENDGRID_KEY && !DRY_RUN) {
  console.error('❌  Missing SENDGRID_API_KEY')
  process.exit(1)
}

// ─── Init clients ─────────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
if (!DRY_RUN) sgMail.setApiKey(SENDGRID_KEY)

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(listing) {
  const claimUrl = `${SITE}/claim/${listing.slug}`
  const listingUrl = `${SITE}/listings/${listing.slug}`
  return {
    to: listing.email,
    from: { email: FROM_EMAIL, name: 'SafferBiz' },
    subject: `Claim your business on SafferBiz ✓`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi there,</p>
          <p style="color: #555;">
            Your business <strong>${listing.business_name}</strong> is listed on SafferBiz, the directory
            South African expats use to find SA businesses around the world. 🇿🇦
          </p>
          <p style="color: #555;">
            We've just launched <strong>verified business profiles</strong> — and we'd love for you to claim yours.
            When you claim your listing, you'll get:
          </p>
          <ul style="color: #555; font-size: 14px; line-height: 1.9;">
            <li>A blue <strong>✓ Verified</strong> badge that helps customers trust you</li>
            <li>The ability to <strong>update your own details</strong> anytime — description, products, links and more</li>
            <li>Peace of mind that your info is accurate</li>
          </ul>

          <a href="${claimUrl}" style="display: inline-block; background: #007A4D; color: white; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Claim ${listing.business_name} →
          </a>

          <p style="color: #777; font-size: 13px;">
            It takes a minute — we review each claim by hand and email you a private link to manage your listing once approved.
          </p>
          <p style="color: #777; font-size: 13px;">
            You can preview your current listing <a href="${listingUrl}" style="color: #007A4D;">here</a>.
            If this business isn't yours or you'd rather not be listed, just reply and we'll sort it out.
          </p>

          <p style="color: #555; margin-top: 24px;">Cheers,<br/>Estie<br/>SafferBiz</p>
        </div>
      </div>
    `,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍  DRY RUN — no emails will be sent\n' : '📧  LIVE RUN — emails will be sent\n')

  // Active listings, with an email, not yet claimed
  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, business_name, slug, email, city, country, is_verified, claimed_by_email')
    .eq('status', 'active')
    .not('email', 'is', null)
    .neq('email', '')
    .is('claimed_by_email', null)
    .order('business_name', { ascending: true })

  if (error) {
    console.error('❌  Supabase error:', error.message)
    process.exit(1)
  }

  let recipients = listings ?? []
  if (ONLY) recipients = recipients.filter(l => (l.email ?? '').toLowerCase() === ONLY)

  if (recipients.length === 0) {
    console.log('ℹ️  No matching unclaimed listings with an email found.')
    return
  }

  // --test: send a single sample email (built from a real listing) to yourself, then stop
  if (TEST) {
    const sample = recipients[0]
    console.log(`🧪  Sending ONE sample email to ${TEST} (content from "${sample.business_name}")...\n`)
    if (DRY_RUN) { console.log('   [dry-run] not actually sending.'); return }
    const msg = buildEmail(sample)
    msg.to = TEST
    await sgMail.send(msg)
    console.log(`✅  Sample sent to ${TEST}. Check your inbox, then run for real when happy.`)
    return
  }

  // De-dupe info: warn if any email owns multiple listings (they'd get one per listing)
  const emailCounts = {}
  for (const l of recipients) emailCounts[l.email.toLowerCase()] = (emailCounts[l.email.toLowerCase()] ?? 0) + 1
  const dupes = Object.entries(emailCounts).filter(([, n]) => n > 1)

  const toSend = LIMIT ? recipients.slice(0, LIMIT) : recipients

  console.log(`Found ${recipients.length} unclaimed listing(s) with an email.`)
  if (LIMIT) console.log(`--limit=${LIMIT} → sending to the first ${toSend.length}.`)
  if (dupes.length) console.log(`⚠️  ${dupes.length} email(s) own multiple listings and would receive one email each.`)
  console.log()

  let sent = 0
  let failed = 0

  for (const listing of toSend) {
    const location = [listing.city, listing.country].filter(Boolean).join(', ')
    console.log(`  🏪 ${listing.business_name}${location ? ` — ${location}` : ''}`)
    console.log(`     ✉️  ${listing.email}`)

    if (DRY_RUN) {
      console.log(`     ↳  [dry-run] would send claim invite → ${SITE}/claim/${listing.slug}\n`)
      continue
    }

    try {
      await sgMail.send(buildEmail(listing))
      console.log(`     ↳  ✅ sent\n`)
      sent++
      await new Promise(r => setTimeout(r, 300)) // gentle rate limit
    } catch (err) {
      console.error(`     ↳  ❌ failed: ${err.message}\n`)
      failed++
    }
  }

  console.log('─'.repeat(50))
  if (DRY_RUN) {
    console.log(`✅  Dry run complete — ${toSend.length} listing(s) would receive an invite.`)
    console.log(`    Next: test with  node scripts/email-claim-invite.mjs --limit=1`)
    console.log(`    Then send all:   node scripts/email-claim-invite.mjs`)
  } else {
    console.log(`✅  Done — ${sent} sent, ${failed} failed${LIMIT ? ` (limited to ${LIMIT})` : ''}.`)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
