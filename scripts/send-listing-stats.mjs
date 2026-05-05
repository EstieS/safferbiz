/**
 * send-listing-stats.mjs
 *
 * Sends each active business owner a monthly stats email showing
 * their view count, click count, and Popular badge status.
 *
 * Run once a month — first of the month is ideal.
 *
 * Usage:
 *   node scripts/send-listing-stats.mjs            → sends to all active listings with an email
 *   node scripts/send-listing-stats.mjs --dry-run  → prints to console, no emails sent
 *   node scripts/send-listing-stats.mjs --popular  → only send to listings with ≥50 views
 */

import { createClient } from '@supabase/supabase-js'
import sgMail from '@sendgrid/mail'
import * as dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

// ─── Config ───────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const SENDGRID_KEY = process.env.SENDGRID_API_KEY
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL ?? 'admin@safferbiz.com'
const SITE = 'https://safferbiz.com'
const POPULAR_THRESHOLD = 50

const args = process.argv.slice(2)
const DRY_RUN = args.includes('--dry-run')
const POPULAR_ONLY = args.includes('--popular')

// ─── Validate ─────────────────────────────────────────────────────────────────

const missing = []
if (!SUPABASE_URL) missing.push('NEXT_PUBLIC_SUPABASE_URL')
if (!SUPABASE_KEY) missing.push('SUPABASE_SERVICE_ROLE_KEY')
if (!SENDGRID_KEY && !DRY_RUN) missing.push('SENDGRID_API_KEY')

if (missing.length) {
  console.error(`❌ Missing env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
if (!DRY_RUN) sgMail.setApiKey(SENDGRID_KEY)

// ─── Email builder ────────────────────────────────────────────────────────────

function buildEmail(listing) {
  const listingUrl = `${SITE}/listings/${listing.slug}`
  const isPopular = listing.view_count >= POPULAR_THRESHOLD

  return {
    to: listing.email,
    from: { email: FROM_EMAIL, name: 'SafferBiz' },
    subject: `Your SafferBiz listing stats for ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi there,</p>
          <p style="color: #555;">Here's how your listing for <strong>${listing.business_name}</strong> is performing on SafferBiz:</p>

          <div style="display: flex; gap: 16px; margin: 24px 0;">
            <div style="flex: 1; background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 36px; font-weight: bold; color: #007A4D;">${listing.view_count}</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #555;">👁 Total views</p>
            </div>
            <div style="flex: 1; background: #eff6ff; border: 1px solid #93c5fd; border-radius: 8px; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 36px; font-weight: bold; color: #1d4ed8;">${listing.click_count}</p>
              <p style="margin: 8px 0 0; font-size: 13px; color: #555;">🔗 Link clicks</p>
            </div>
          </div>

          ${isPopular ? `<p style="color: #ea580c; font-size: 14px; font-weight: bold; margin-bottom: 16px;">🔥 Your listing has earned the Popular badge — SA expats are finding you!</p>` : ''}

          <a href="${listingUrl}" style="display: inline-block; background: #007A4D; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 13px;">
            View Your Listing →
          </a>

          <p style="margin-top: 32px; color: #555; font-size: 13px;">
            Need to update your listing details? Just reply to this email.<br/><br/>
            Cheers,<br/>Estie<br/>SafferBiz
          </p>
        </div>
      </div>
    `,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const month = new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  console.log(`\n🇿🇦 SafferBiz Monthly Stats Mailer — ${month}`)
  console.log(`   ${DRY_RUN ? '(DRY RUN — no emails sent)' : 'Sending live emails'}`)
  console.log(`   ${POPULAR_ONLY ? 'Only listings with ≥50 views' : 'All active listings with an email'}\n`)

  // Fetch listings
  let query = supabase
    .from('listings')
    .select('id, business_name, slug, email, view_count, click_count')
    .eq('status', 'active')
    .not('email', 'is', null)
    .order('view_count', { ascending: false })

  if (POPULAR_ONLY) {
    query = query.gte('view_count', POPULAR_THRESHOLD)
  }

  const { data: listings, error } = await query

  if (error) {
    console.error('❌ Failed to fetch listings:', error.message)
    process.exit(1)
  }

  if (!listings?.length) {
    console.log('ℹ️  No listings found matching criteria.')
    process.exit(0)
  }

  console.log(`📋 Found ${listings.length} listing${listings.length > 1 ? 's' : ''} to email\n`)

  // Print summary table
  console.log('   Business                          Views  Clicks  Popular')
  console.log('   ' + '─'.repeat(58))
  for (const l of listings) {
    const name = l.business_name.padEnd(34).slice(0, 34)
    const views = String(l.view_count ?? 0).padStart(5)
    const clicks = String(l.click_count ?? 0).padStart(6)
    const popular = (l.view_count ?? 0) >= POPULAR_THRESHOLD ? '  🔥' : ''
    console.log(`   ${name} ${views}  ${clicks}  ${popular}`)
  }
  console.log()

  if (DRY_RUN) {
    console.log('✅ Dry run complete — no emails sent.')
    console.log('   Run without --dry-run to send for real.\n')
    return
  }

  // Send emails
  let sent = 0
  let failed = 0

  for (const listing of listings) {
    process.stdout.write(`   Emailing "${listing.business_name}"... `)
    try {
      await sgMail.send(buildEmail(listing))
      sent++
      console.log('✅')
      await new Promise(r => setTimeout(r, 200))
    } catch (err) {
      console.log('❌')
      console.error(`   Error: ${err.message}`)
      failed++
    }
  }

  console.log(`\n📊 Done: ${sent} sent, ${failed} failed\n`)
}

main()
