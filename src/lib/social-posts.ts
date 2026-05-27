import Anthropic from '@anthropic-ai/sdk'
import sgMail from '@sendgrid/mail'

const SITE = 'https://safferbiz.com'
const ADMIN_EMAIL = 'safferbiz@gmail.com'
const FROM = process.env.SENDGRID_FROM_EMAIL!

function getClients() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!)
  return { anthropic }
}

function parsePost(raw: string): { facebook: string; instagram: string } {
  const fbMatch = raw.match(/--- FACEBOOK ---\s*([\s\S]*?)(?=--- INSTAGRAM ---|$)/)
  const igMatch = raw.match(/--- INSTAGRAM ---\s*([\s\S]*?)$/)
  return {
    facebook: fbMatch?.[1]?.trim() ?? raw,
    instagram: igMatch?.[1]?.trim() ?? '',
  }
}

function emailHtml(name: string, listingUrl: string, facebook: string, instagram: string) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 700px; margin: 0 auto;">
      <div style="background: #007A4D; padding: 24px; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Social Media Draft Ready</p>
      </div>
      <div style="padding: 32px 24px;">
        <p style="color: #555; margin-top: 0;">
          A draft post has been generated for <strong>${name}</strong>.
          <a href="${listingUrl}" style="color: #007A4D;">View listing →</a>
        </p>

        <!-- First comment tip -->
        <div style="background: #fffbea; border: 1.5px solid #f5c842; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px;">
          <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #7a6000;">💡 How to post for best reach</p>
          <ol style="margin: 0; padding-left: 18px; font-size: 13px; color: #555; line-height: 1.8;">
            <li>Add an eye-catching photo of the business/product (check their website or IG)</li>
            <li>Paste the post copy below — <strong>do not include the link in the post itself</strong></li>
            <li>After posting, immediately add the first comment with the link:<br/>
              <span style="display:inline-block; margin-top:4px; background:#f0f0f0; padding: 4px 10px; border-radius:4px; font-family: monospace; font-size: 13px; color: #333;">${listingUrl}</span>
            </li>
          </ol>
          <p style="margin: 8px 0 0; font-size: 12px; color: #999;">Posts without links in the text get significantly more reach on Facebook & Instagram.</p>
        </div>

        <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #1877F2;">📘 FACEBOOK</p>
        <div style="background: #f0f4ff; border-left: 3px solid #1877F2; padding: 14px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6; margin-bottom: 20px;">${facebook}</div>

        <p style="margin: 0 0 6px; font-weight: bold; font-size: 13px; color: #E1306C;">📸 INSTAGRAM</p>
        <div style="background: #fff0f6; border-left: 3px solid #E1306C; padding: 14px 16px; border-radius: 4px; font-size: 14px; color: #333; white-space: pre-wrap; line-height: 1.6;">${instagram}</div>

        <p style="margin-top: 24px; font-size: 12px; color: #999;">
          Generated automatically when this item was approved · ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>
    </div>
  `
}

// ─── Listing post ─────────────────────────────────────────────────────────────

export async function generateListingPost(listing: {
  business_name: string
  slug: string
  description: string | null
  category: string
  city: string | null
  state: string | null
  country: string
  website_url: string | null
  tags: string[]
  sells_online: boolean
}) {
  const { anthropic } = getClients()

  const location = [listing.city, listing.state, listing.country].filter(Boolean).join(', ')
  const tags = (listing.tags ?? []).slice(0, 6).join(', ')
  const listingUrl = `${SITE}/listings/${listing.slug}`

  const prompt = `You write social media posts for SafferBiz — a directory of South African-owned businesses around the world, for SA expats to find a taste of home.

Write TWO versions of a social media post featuring this business:
1. A Facebook post (2–3 short paragraphs, warm and community-focused, a couple of emojis)
2. An Instagram caption (punchy, 3–5 lines + 8–10 relevant hashtags at the end)

Business details:
- Name: ${listing.business_name}
- Location: ${location}
- Category: ${listing.category}
- Description: ${listing.description ?? 'No description provided'}
${tags ? `- Products/Services: ${tags}` : ''}
${listing.sells_online ? '- Ships/delivers online ✅' : ''}

Guidelines:
- Write in a friendly, community-spirited tone — like you're telling a fellow SA expat about a great find
- Mention the location so local expats know it's near them
- DO NOT include any URLs or links anywhere in the posts — the link will be added separately in the first comment
- End the Facebook post with a natural call to action like "Link in the first comment 👇" or "Find them via the link below 👇"
- End the Instagram caption with "Link in bio 🔗" or similar
- Don't make up details not in the description
- Facebook post: ~80–120 words
- Instagram caption: ~40–60 words before hashtags

Format exactly like this:
--- FACEBOOK ---
[facebook post here]

--- INSTAGRAM ---
[instagram caption here]`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const { facebook, instagram } = parsePost((message.content[0] as { text: string }).text)

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `📱 Post draft ready: ${listing.business_name}`,
    html: emailHtml(listing.business_name, listingUrl, facebook, instagram),
  })
}

// ─── Event post ───────────────────────────────────────────────────────────────

export async function generateEventPost(event: {
  title: string
  slug: string
  description: string | null
  category: string
  city: string | null
  country: string
  event_date: string
  event_end_date: string | null
  venue: string | null
  url: string | null
}) {
  const { anthropic } = getClients()

  const location = [event.venue, event.city, event.country].filter(Boolean).join(', ')
  const eventUrl = `${SITE}/events/${event.slug}`
  const date = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })
  const dateRange = event.event_end_date
    ? `${date} – ${new Date(event.event_end_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : date

  const prompt = `You write social media posts for SafferBiz — a directory of South African events around the world, for SA expats.

Write TWO versions of a social media post promoting this event:
1. A Facebook post (2–3 short paragraphs, excited and community-focused, a couple of emojis)
2. An Instagram caption (punchy, 3–5 lines + 8–10 relevant hashtags at the end)

Event details:
- Title: ${event.title}
- Date: ${dateRange}
- Location: ${location}
- Category: ${event.category}
- Description: ${event.description ?? 'No description provided'}

Guidelines:
- Create excitement and a sense of community — SA expats love connecting in person
- Mention the date and location clearly so people know if it's near them
- DO NOT include any URLs or links anywhere in the posts — the link will be added separately in the first comment
- End the Facebook post with a natural call to action like "Full details in the first comment 👇" or "Grab your spot — link below 👇"
- End the Instagram caption with "Link in bio 🔗" or similar
- Facebook post: ~80–120 words
- Instagram caption: ~40–60 words before hashtags

Format exactly like this:
--- FACEBOOK ---
[facebook post here]

--- INSTAGRAM ---
[instagram caption here]`

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  })

  const { facebook, instagram } = parsePost((message.content[0] as { text: string }).text)

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `📱 Event post draft ready: ${event.title}`,
    html: emailHtml(event.title, eventUrl, facebook, instagram),
  })
}
