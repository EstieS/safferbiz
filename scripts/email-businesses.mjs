import sgMail from '@sendgrid/mail'
import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
config({ path: join(__dirname, '../.env.local') })

sgMail.setApiKey(process.env.SENDGRID_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const SITE = 'https://safferbiz.com'
const FROM = process.env.SENDGRID_FROM_EMAIL

// Fetch all active listings with emails
const { data, error } = await supabase
  .from('listings')
  .select('business_name, slug, email, city, country')
  .eq('status', 'active')
  .not('email', 'is', null)
  .order('business_name')

if (error) {
  console.error('Failed to fetch listings:', error.message)
  process.exit(1)
}

// Deduplicate by email — keep first listing per email
const all = [...new Map(data.map(l => [l.email.toLowerCase(), l])).values()]

// Filter out malformed emails (e.g. someone put a URL in the email field)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const unique = all.filter(l => {
  if (!emailRegex.test(l.email)) {
    console.warn(`⚠ Skipping ${l.business_name} — invalid email: ${l.email}`)
    return false
  }
  return true
})

console.log(`Sending to ${unique.length} businesses...\n`)

let sent = 0
let failed = 0

for (const listing of unique) {
  const listingUrl = `${SITE}/listings/${listing.slug}`

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #007A4D; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #555; margin-top: 0;">Hi there,</p>

        <p style="color: #555;">Thank you for being part of SafferBiz! Your business <strong>${listing.business_name}</strong> is listed on <a href="${SITE}" style="color: #007A4D;">safferbiz.com</a> — a directory helping South African expats around the world find businesses, products, and services from home.</p>

        <p style="color: #555;">I'll be honest — I launched the site a little while ago and it's been quieter than I'd like, but that's about to change. I've just given SafferBiz a fresh new look and I'm actively growing the directory, adding new features, and getting the word out to SA communities worldwide. An updated app is also coming soon! I want SafferBiz to be <em>the</em> go-to place for expats looking for a taste of home.</p>

        <p style="color: #555; font-weight: bold;">Could you take 2 minutes to check your listing?</p>

        <div style="margin: 24px 0;">
          <a href="${listingUrl}" style="display: inline-block; background: #007A4D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View your listing on SafferBiz →
          </a>
        </div>

        <p style="color: #555;">A few things worth checking:</p>
        <ul style="color: #555; padding-left: 20px; line-height: 1.8;">
          <li>Is your business info correct? (name, location, website, description)</li>
          <li><strong>Tags</strong> — these are searchable keywords that help people find you when they search for things like <em>biltong</em>, <em>rusks</em>, <em>boerewors</em>, etc. I manage the tags on your behalf, so just <strong>reply to this email</strong> and let me know which products or keywords you'd like added to your listing.</li>
          <li>Do you sell online? Let me know and I'll make sure that's reflected too.</li>
        </ul>

        <p style="color: #555;">And if you know of any other South African businesses that should be listed — please send them our way!</p>

        <p style="color: #555;">Lekker dag,<br/>Estie<br/>SafferBiz</p>
      </div>
    </div>
  `

  try {
    await sgMail.send({
      to: listing.email,
      from: { email: FROM, name: 'SafferBiz' },
      replyTo: FROM,
      subject: 'Your SafferBiz listing — please check your details 🇿🇦',
      html,
    })
    console.log(`✓ ${listing.business_name} <${listing.email}>`)
    sent++
  } catch (err) {
    console.error(`✗ ${listing.business_name} <${listing.email}>: ${err.message}`)
    failed++
  }

  // Respect SendGrid rate limits — small pause between sends
  await new Promise(r => setTimeout(r, 200))
}

console.log(`\nDone! ${sent} sent, ${failed} failed.`)
