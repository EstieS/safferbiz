/**
 * email-logo-request.mjs
 *
 * One-time campaign: emails the owner of every VERIFIED listing that has a
 * contact email, giving them a private magic link to add a logo (and update
 * anything else) on their listing.
 *
 * For each listing it mints a fresh 60-day management token (replacing any
 * previous one for that listing), so every link it sends is guaranteed to work.
 *
 * By default it SKIPS listings that already have a logo — pass --include-existing
 * to email those owners too (e.g. to ask them to refresh a low-quality logo).
 *
 * Usage:
 *   node scripts/email-logo-request.mjs --dry-run          → preview only, nothing sent, no tokens minted (START HERE)
 *   node scripts/email-logo-request.mjs --test=you@x.com   → mint a token for the first listing + send ONE sample to you, then stop
 *   node scripts/email-logo-request.mjs --limit=1          → send to just the first real recipient
 *   node scripts/email-logo-request.mjs --only=biz@x.com   → send only to the listing(s) with this exact email
 *   node scripts/email-logo-request.mjs --claimed-only    → only owners who claimed their listing (skip admin-verified)
 *   node scripts/email-logo-request.mjs --include-existing → also email owners whose listing already has a logo
 *   node scripts/email-logo-request.mjs                    → send to everyone for real
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL   = process.env.SENDGRID_FROM_EMAIL ?? 'admin@safferbiz.com'
const SITE         = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://safferbiz.com'

const TOKEN_TTL_DAYS = 60

const DRY_RUN          = process.argv.includes('--dry-run')
const INCLUDE_EXISTING = process.argv.includes('--include-existing')
const CLAIMED_ONLY     = process.argv.includes('--claimed-only')
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

// ─── Token minting ────────────────────────────────────────────────────────────

async function mintManageToken(listingId) {
  const token = randomUUID() + randomUUID().replace(/-/g, '')
  const expires_at = new Date(Date.now() + TOKEN_TTL_DAYS * 86400000).toISOString()
  const { error } = await supabase
    .from('listing_manage_tokens')
    .upsert({ listing_id: listingId, token, expires_at }, { onConflict: 'listing_id' })
  if (error) throw new Error(`token upsert failed: ${error.message}`)
  return token
}

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(listing, manageUrl) {
  const listingUrl = `${SITE}/listings/${listing.slug}`
  const hasLogo = !!listing.logo_url
  const ask = hasLogo
    ? `Business owners can now manage their own logo on their listing. ${listing.business_name} already has one, but if you'd like to swap it for a sharper version, you can now do that yourself.`
    : `Business owners can now add their own logo to their listing. There isn't one on ${listing.business_name} yet, and a logo really helps a listing stand out, both in the directory and in the posts we share on social.`

  // Deliberately plain + personal so Gmail treats it as a 1:1 note (Primary tab)
  // rather than a marketing blast: no header banner, no big button, plain-text
  // links, conversational tone. Matches email-claim-invite.mjs.
  return {
    to: listing.email,
    from: { email: FROM_EMAIL, name: 'Estie at SafferBiz' },
    replyTo: FROM_EMAIL,
    subject: `Add a logo to your SafferBiz listing for ${listing.business_name}`,
    text:
`Hi there,

It's Estie from SafferBiz, with a quick heads-up about something new. ${ask}

Here's your private link to do it:
${manageUrl}

Open that link, and the Logo box is right at the top of the form. A few tips:

- Square images work best. If yours isn't square we'll just pad it, nothing gets cropped.
- JPG, PNG or WebP. We resize and compress it for you, so a big file is fine.
- Keep it simple and high-contrast so it still reads at a small size.

While you're there you can also fix your description, products, links and contact details. Changes go live straight away.

That link is yours alone and works for the next ${TOKEN_TTL_DAYS} days. If it expires just reply to this email and I'll send a fresh one.

Your listing, for reference:
${listingUrl}

Cheers,
Estie
SafferBiz`,
    html: `
      <div style="font-family: Arial, Helvetica, sans-serif; font-size: 15px; color: #222; line-height: 1.6; max-width: 600px;">
        <p>Hi there,</p>
        <p>It's Estie from SafferBiz, with a quick heads-up about something new. ${ask}</p>
        <p>Here's your private link to do it:<br/>
          <a href="${manageUrl}" style="color: #007A4D;">${manageUrl}</a>
        </p>
        <p>Open that link, and the Logo box is right at the top of the form. A few tips:</p>
        <ul style="margin: 0 0 16px; padding-left: 20px; color: #444;">
          <li>Square images work best. If yours isn't square we'll just pad it, nothing gets cropped.</li>
          <li>JPG, PNG or WebP. We resize and compress it for you, so a big file is fine.</li>
          <li>Keep it simple and high-contrast so it still reads at a small size.</li>
        </ul>
        <p>While you're there you can also fix your description, products, links and contact details. Changes go live straight away.</p>
        <p>That link is yours alone and works for the next ${TOKEN_TTL_DAYS} days. If it expires just reply to this email and I'll send a fresh one.</p>
        <p>Your listing, for reference:<br/>
          <a href="${listingUrl}" style="color: #007A4D;">${listingUrl}</a>
        </p>
        <p>Cheers,<br/>Estie<br/>SafferBiz</p>
      </div>
    `,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍  DRY RUN — no emails sent, no tokens minted\n' : '📧  LIVE RUN — tokens will be minted and emails sent\n')

  let query = supabase
    .from('listings')
    .select('id, business_name, slug, email, city, country, logo_url, verified_via, claimed_by_email')
    .eq('status', 'active')
    .eq('is_verified', true)
    .not('email', 'is', null)
    .neq('email', '')
    .order('business_name', { ascending: true })

  if (!INCLUDE_EXISTING) query = query.is('logo_url', null)
  // --claimed-only: just the owners who actively claimed their listing (they know
  // SafferBiz and expect mail from us). Excludes admin-verified listings whose
  // owner may not know they're listed.
  if (CLAIMED_ONLY) query = query.not('claimed_by_email', 'is', null)

  const { data: listings, error } = await query
  if (error) {
    console.error('❌  Supabase error:', error.message)
    process.exit(1)
  }

  let recipients = listings ?? []
  if (ONLY) recipients = recipients.filter(l => (l.email ?? '').toLowerCase() === ONLY)

  if (recipients.length === 0) {
    console.log('ℹ️  No matching verified listings with an email found.')
    console.log(INCLUDE_EXISTING ? '' : '    (listings that already have a logo are skipped — pass --include-existing to include them)')
    return
  }

  // --test: mint a token for the first listing and send ONE sample to yourself
  if (TEST) {
    const sample = recipients[0]
    console.log(`🧪  Sending ONE sample email to ${TEST} (content from "${sample.business_name}")...\n`)
    if (DRY_RUN) { console.log('   [dry-run] not minting or sending.'); return }
    const token = await mintManageToken(sample.id)
    const msg = buildEmail(sample, `${SITE}/manage/${sample.slug}?token=${token}`)
    msg.to = TEST
    await sgMail.send(msg)
    console.log(`✅  Sample sent to ${TEST}. The link in it is live — click it to try the upload, then run for real when happy.`)
    return
  }

  // Warn if any email owns multiple listings (one email per listing, each with its own link)
  const emailCounts = {}
  for (const l of recipients) emailCounts[l.email.toLowerCase()] = (emailCounts[l.email.toLowerCase()] ?? 0) + 1
  const dupes = Object.entries(emailCounts).filter(([, n]) => n > 1)

  const toSend = LIMIT ? recipients.slice(0, LIMIT) : recipients

  const claimed = recipients.filter(l => l.claimed_by_email).length
  console.log(`Found ${recipients.length} ${CLAIMED_ONLY ? 'owner-claimed' : 'verified'} listing(s) with an email${INCLUDE_EXISTING ? '' : ' and no logo yet'}.`)
  if (!CLAIMED_ONLY) console.log(`   ${claimed} owner-claimed, ${recipients.length - claimed} admin-verified (pass --claimed-only to email just the claimed ones).`)
  if (LIMIT) console.log(`--limit=${LIMIT} → sending to the first ${toSend.length}.`)
  if (dupes.length) console.log(`⚠️  ${dupes.length} email(s) own multiple listings and would receive one email each.`)
  console.log()

  let sent = 0
  let failed = 0

  for (const listing of toSend) {
    const location = [listing.city, listing.country].filter(Boolean).join(', ')
    console.log(`  🏪 ${listing.business_name}${location ? ` — ${location}` : ''}  [${listing.claimed_by_email ? 'claimed' : 'admin-verified'}]${listing.logo_url ? ' (has logo)' : ''}`)
    console.log(`     ✉️  ${listing.email}`)

    if (DRY_RUN) {
      console.log(`     ↳  [dry-run] would mint token + send → ${SITE}/manage/${listing.slug}?token=…\n`)
      continue
    }

    try {
      const token = await mintManageToken(listing.id)
      await sgMail.send(buildEmail(listing, `${SITE}/manage/${listing.slug}?token=${token}`))
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
    console.log(`✅  Dry run complete — ${toSend.length} listing(s) would be emailed.`)
    console.log(`    Next: sample it with  node scripts/email-logo-request.mjs --test=${FROM_EMAIL}`)
    console.log(`    Then send all:         node scripts/email-logo-request.mjs`)
  } else {
    console.log(`✅  Done — ${sent} sent, ${failed} failed${LIMIT ? ` (limited to ${LIMIT})` : ''}.`)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
