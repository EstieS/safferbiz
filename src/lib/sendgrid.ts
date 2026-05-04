import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const FROM = process.env.SENDGRID_FROM_EMAIL!
const ADMIN_EMAIL = 'safferbiz@gmail.com'
const SITE = 'https://safferbiz.com'

export async function sendNewListingAlert(params: {
  subscribers: { name: string; email: string; unsubscribe_token: string }[]
  listing: { business_name: string; slug: string; category: string; city: string | null; country: string; description: string | null }
}) {
  const { subscribers, listing } = params
  if (subscribers.length === 0) return

  const listingUrl = `${SITE}/listings/${listing.slug}`
  const location = [listing.city, listing.country].filter(Boolean).join(', ')

  function truncate(text: string, max: number) {
    if (text.length <= max) return text
    return text.substring(0, text.lastIndexOf(' ', max)) + '...'
  }

  const messages = subscribers.map((sub) => ({
    to: sub.email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `New listing on SafferBiz: ${listing.business_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi ${sub.name},</p>
          <p style="color: #555;">A new South African business has just been added to SafferBiz — check it out!</p>

          <div style="background: #f9f9f9; border-left: 4px solid #007A4D; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #111;">${listing.business_name}</h2>
            <p style="margin: 0 0 4px; color: #007A4D; font-size: 14px;">📍 ${location} &nbsp;·&nbsp; ${listing.category}</p>
            ${listing.description ? `<p style="margin: 12px 0 0; color: #555; font-size: 14px;">${truncate(listing.description, 180)}</p>` : ''}
          </div>

          <a href="${listingUrl}" style="display: inline-block; background: #007A4D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Listing →
          </a>

          <p style="margin-top: 40px; font-size: 12px; color: #999;">
            You're receiving this because you subscribed to SafferBiz alerts.<br/>
            <a href="${SITE}/unsubscribe?token=${sub.unsubscribe_token}" style="color: #999;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  }))

  await sgMail.send(messages)
}

export async function sendNewEventAlert(params: {
  subscribers: { name: string; email: string; unsubscribe_token: string }[]
  event: { title: string; slug: string; category: string; city: string | null; country: string; event_date: string; description: string | null }
}) {
  const { subscribers, event } = params
  if (subscribers.length === 0) return

  const eventUrl = `${SITE}/events/${event.slug}`
  const location = [event.city, event.country].filter(Boolean).join(', ')
  const date = new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  const messages = subscribers.map((sub) => ({
    to: sub.email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `New SA event: ${event.title}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi ${sub.name},</p>
          <p style="color: #555;">A new South African event has been listed on SafferBiz!</p>

          <div style="background: #fff5f5; border-left: 4px solid #DE3831; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #111;">🎉 ${event.title}</h2>
            <p style="margin: 0 0 4px; color: #DE3831; font-size: 14px;">📅 ${date}</p>
            <p style="margin: 4px 0; color: #DE3831; font-size: 14px;">📍 ${location} &nbsp;·&nbsp; ${event.category}</p>
            ${event.description ? `<p style="margin: 12px 0 0; color: #555; font-size: 14px;">${event.description}</p>` : ''}
          </div>

          <a href="${eventUrl}" style="display: inline-block; background: #DE3831; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            View Event →
          </a>

          <p style="margin-top: 40px; font-size: 12px; color: #999;">
            You're receiving this because you subscribed to SafferBiz alerts.<br/>
            <a href="${SITE}/unsubscribe?token=${sub.unsubscribe_token}" style="color: #999;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  }))

  await sgMail.send(messages)
}

// Notify admin when a new listing is submitted and needs review
export async function sendNewSubmissionNotification(listing: {
  business_name: string
  category: string
  city: string | null
  country: string
  email: string
}) {
  const location = [listing.city, listing.country].filter(Boolean).join(', ')

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `📋 New listing pending review: ${listing.business_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">A new business listing has been submitted and is waiting for your approval.</p>

          <div style="background: #f9f9f9; border-left: 4px solid #FFB612; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #111;">${listing.business_name}</h2>
            <p style="margin: 0 0 4px; color: #555; font-size: 14px;">📍 ${location} &nbsp;·&nbsp; ${listing.category}</p>
            <p style="margin: 8px 0 0; color: #555; font-size: 14px;">✉️ ${listing.email}</p>
          </div>

          <a href="${SITE}/admin" style="display: inline-block; background: #007A4D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review in Admin →
          </a>
        </div>
      </div>
    `,
  })
}

// Confirm subscription to the new subscriber + BCC admin
export async function sendSubscriptionConfirmation(subscriber: {
  name: string
  email: string
  countries: string[]
  categories: string[]
  wants_events: boolean
  unsubscribe_token: string
}) {
  const prefsLine = [
    subscriber.countries.length ? `🌍 ${subscriber.countries.join(', ')}` : '🌍 All countries',
    subscriber.categories.length ? `🏷️ ${subscriber.categories.join(', ')}` : '🏷️ All categories',
    subscriber.wants_events ? '🎉 Including events' : '',
  ].filter(Boolean).join('<br/>')

  await sgMail.send({
    to: subscriber.email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `You're subscribed to SafferBiz alerts 🎉`,
    // BCC admin so she knows someone signed up
    ...(ADMIN_EMAIL !== subscriber.email ? { bcc: ADMIN_EMAIL } : {}),
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi ${subscriber.name},</p>
          <p style="color: #555;">You're all set! We'll email you when new South African businesses and events matching your preferences are added to SafferBiz.</p>

          <div style="background: #f0faf5; border-left: 4px solid #007A4D; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <p style="margin: 0; font-weight: bold; color: #111; margin-bottom: 8px;">Your preferences:</p>
            <p style="margin: 0; color: #555; font-size: 14px; line-height: 1.8;">${prefsLine}</p>
          </div>

          <a href="${SITE}" style="display: inline-block; background: #007A4D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Browse SafferBiz →
          </a>

          <p style="margin-top: 40px; font-size: 12px; color: #999;">
            Changed your mind? <a href="${SITE}/unsubscribe?token=${subscriber.unsubscribe_token}" style="color: #999;">Unsubscribe</a>
          </p>
        </div>
      </div>
    `,
  })
}
