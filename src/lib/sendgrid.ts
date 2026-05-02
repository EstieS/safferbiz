import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

const FROM = process.env.SENDGRID_FROM_EMAIL!
const SITE = 'https://safferbiz.com'

export async function sendNewListingAlert(params: {
  subscribers: { name: string; email: string; unsubscribe_token: string }[]
  listing: { business_name: string; slug: string; category: string; city: string | null; country: string; description: string | null }
}) {
  const { subscribers, listing } = params
  if (subscribers.length === 0) return

  const listingUrl = `${SITE}/listings/${listing.slug}`
  const location = [listing.city, listing.country].filter(Boolean).join(', ')

  const messages = subscribers.map((sub) => ({
    to: sub.email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `New SA business listed: ${listing.business_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Hi ${sub.name},</p>
          <p style="color: #555;">A new South African business has just been listed on SafferBiz that matches your preferences!</p>

          <div style="background: #f9f9f9; border-left: 4px solid #007A4D; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #111;">${listing.business_name}</h2>
            <p style="margin: 0 0 4px; color: #007A4D; font-size: 14px;">📍 ${location} &nbsp;·&nbsp; ${listing.category}</p>
            ${listing.description ? `<p style="margin: 12px 0 0; color: #555; font-size: 14px;">${listing.description}</p>` : ''}
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
