/**
 * email-event-approval-catchup.mjs
 *
 * One-time script: sends an "your event is live!" email to all active events
 * that have a valid organizer_email. Useful for events approved before the
 * automated approval email was wired up.
 *
 * Usage:
 *   node scripts/email-event-approval-catchup.mjs            → sends for real
 *   node scripts/email-event-approval-catchup.mjs --dry-run  → preview only, no emails sent
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
const SITE         = 'https://safferbiz.com'

const DRY_RUN = process.argv.includes('--dry-run')

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

function buildEmail(event) {
  const eventUrl = `${SITE}/events/${event.slug}`
  return {
    to: event.organizer_email,
    from: { email: FROM_EMAIL, name: 'SafferBiz' },
    subject: `Your event is live on SafferBiz! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi there!</p>
          <p style="color: #555;">
            We wanted to let you know that your event <strong>${event.title}</strong> is live on SafferBiz!
            SA expats in your area can now discover it.
          </p>

          <a href="${eventUrl}" style="display: inline-block; background: #DE3831; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            View Your Event →
          </a>

          <p style="color: #555; margin-top: 24px;">A few ways to spread the word:</p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8;">
            <li>Share the event link with your community</li>
            <li>Post it on your social media pages</li>
            <li>If any details need updating, just reply to this email</li>
          </ul>

          <p style="color: #555;">Thank you for keeping the SA expat community connected!</p>
          <p style="color: #555;">Cheers,<br/>Estie<br/>SafferBiz</p>
        </div>
      </div>
    `,
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log(DRY_RUN ? '🔍  DRY RUN — no emails will be sent\n' : '📧  LIVE RUN — emails will be sent\n')

  // Fetch all active events with a valid organizer_email
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, slug, organizer_email, event_date, city, country')
    .eq('status', 'active')
    .not('organizer_email', 'is', null)
    .neq('organizer_email', '')
    .order('event_date', { ascending: true })

  if (error) {
    console.error('❌  Supabase error:', error.message)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('ℹ️  No active events with an organizer_email found.')
    return
  }

  console.log(`Found ${events.length} event(s) with an organizer email:\n`)

  let sent = 0
  let skipped = 0

  for (const event of events) {
    const location = [event.city, event.country].filter(Boolean).join(', ')
    console.log(`  📅 "${event.title}" (${event.event_date}) — ${location}`)
    console.log(`     ✉️  ${event.organizer_email}`)

    if (DRY_RUN) {
      console.log(`     ↳  [dry-run] would send approval email\n`)
      skipped++
      continue
    }

    try {
      await sgMail.send(buildEmail(event))
      console.log(`     ↳  ✅ sent\n`)
      sent++
      // Brief pause to stay within SendGrid rate limits
      await new Promise(r => setTimeout(r, 300))
    } catch (err) {
      console.error(`     ↳  ❌ failed: ${err.message}\n`)
      skipped++
    }
  }

  console.log('─'.repeat(50))
  if (DRY_RUN) {
    console.log(`✅  Dry run complete — ${events.length} event(s) would receive an email.`)
    console.log(`    Run without --dry-run to send for real.`)
  } else {
    console.log(`✅  Done — ${sent} email(s) sent, ${skipped} skipped/failed.`)
  }
}

main().catch(err => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
