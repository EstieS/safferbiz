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

// Notify business owner when their listing is approved
export async function sendListingApprovedEmail(listing: {
  business_name: string
  slug: string
  email: string
}) {
  const listingUrl = `${SITE}/listings/${listing.slug}`

  await sgMail.send({
    to: listing.email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `Your SafferBiz listing is live! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Great news!</p>
          <p style="color: #555;">Your listing for <strong>${listing.business_name}</strong> has been approved and is now live on SafferBiz. South African expats worldwide can now find you!</p>

          <a href="${listingUrl}" style="display: inline-block; background: #007A4D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            View Your Listing →
          </a>

          <p style="color: #555; margin-top: 24px;">A few tips to make the most of your listing:</p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8;">
            <li>Share your listing link with your customers</li>
            <li>Add it to your social media profiles</li>
            <li>Let us know if any details need updating — just reply to this email</li>
          </ul>

          <p style="color: #555;">Thank you for being part of the SafferBiz community!</p>
          <p style="color: #555;">Cheers,<br/>Estie<br/>SafferBiz</p>
        </div>
      </div>
    `,
  })
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

// Notify event organiser when their event is approved
export async function sendEventApprovedEmail(event: {
  title: string
  slug: string
  email: string
  manageUrl?: string
}) {
  const eventUrl = `${SITE}/events/${event.slug}`

  await sgMail.send({
    to: event.email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `Your event is live on SafferBiz! 🎉`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Great news!</p>
          <p style="color: #555;">Your event <strong>${event.title}</strong> has been approved and is now live on SafferBiz. SA expats in your area can now find it!</p>

          <a href="${eventUrl}" style="display: inline-block; background: #DE3831; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            View Your Event →
          </a>

          ${event.manageUrl ? `
          <div style="background: #f9f9f9; border-left: 4px solid #007A4D; padding: 16px 20px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0 0 8px; color: #555; font-size: 14px;">Need to fix the date, venue or any other details? You can update them yourself anytime:</p>
            <a href="${event.manageUrl}" style="color: #007A4D; font-weight: bold; font-size: 14px;">Manage your event →</a>
            <p style="margin: 8px 0 0; color: #999; font-size: 12px;">Keep this link private — anyone with it can edit your event.</p>
          </div>
          ` : `
          <p style="color: #555; margin-top: 24px;">If any details need updating, just reply to this email.</p>
          `}

          <p style="color: #555; margin-top: 24px;">A few ways to spread the word:</p>
          <ul style="color: #555; font-size: 14px; line-height: 1.8;">
            <li>Share the event link with your community</li>
            <li>Post it on your social media pages</li>
          </ul>

          <p style="color: #555;">Thank you for keeping the SA expat community connected!</p>
          <p style="color: #555;">Cheers,<br/>Estie<br/>SafferBiz</p>
        </div>
      </div>
    `,
  })
}

// Notify admin when a business owner submits a claim for review
export async function sendClaimSubmittedNotification(params: {
  business_name: string
  slug: string
  claimant_name: string
  claimant_email: string
  message: string | null
}) {
  const { business_name, slug, claimant_name, claimant_email, message } = params

  await sgMail.send({
    to: ADMIN_EMAIL,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `🙋 Claim submitted: ${business_name}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1D9BF0; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
          <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Listing claim awaiting review</p>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Someone says they own a listed business and wants to claim it.</p>

          <div style="background: #f0f8ff; border-left: 4px solid #1D9BF0; padding: 20px; border-radius: 4px; margin: 24px 0;">
            <h2 style="margin: 0 0 8px; color: #111;">${business_name}</h2>
            <p style="margin: 0 0 4px; color: #555; font-size: 14px;">👤 ${claimant_name}</p>
            <p style="margin: 0 0 4px; color: #555; font-size: 14px;">✉️ ${claimant_email}</p>
            <p style="margin: 0 0 4px; color: #555; font-size: 14px;">🔗 ${SITE}/listings/${slug}</p>
            ${message ? `<p style="margin: 12px 0 0; color: #555; font-size: 14px; font-style: italic;">“${message}”</p>` : ''}
          </div>

          <a href="${SITE}/admin" style="display: inline-block; background: #1D9BF0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Review in Admin →
          </a>
          <p style="margin-top: 16px; font-size: 13px; color: #999;">Approving verifies the listing and emails the owner an edit link.</p>
        </div>
      </div>
    `,
  })
}

// Notify the owner that their claim was approved — includes a private edit link
export async function sendClaimApprovedEmail(params: {
  business_name: string
  email: string
  manageUrl: string
}) {
  const { business_name, email, manageUrl } = params

  await sgMail.send({
    to: email,
    from: { email: FROM, name: 'SafferBiz' },
    subject: `You're verified! Manage ${business_name} on SafferBiz ✓`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #007A4D; padding: 24px; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
        </div>
        <div style="padding: 32px 24px;">
          <p style="color: #555; margin-top: 0;">Great news!</p>
          <p style="color: #555;">Your claim for <strong>${business_name}</strong> has been approved. Your listing now shows a blue <strong>✓ Verified</strong> badge, which helps SA expats trust it.</p>

          <p style="color: #555;">You can now keep your details up to date yourself using your private management link below:</p>

          <a href="${manageUrl}" style="display: inline-block; background: #007A4D; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 16px 0;">
            Manage Your Listing →
          </a>

          <p style="color: #999; font-size: 13px;">Keep this link private — anyone with it can edit your listing. It's valid for 30 days; reply to this email if you need a fresh one.</p>

          <p style="color: #555; margin-top: 24px;">Cheers,<br/>Estie<br/>SafferBiz</p>
        </div>
      </div>
    `,
  })
}

// Monthly stats email to a business — views and clicks
export async function sendListingStatsEmail(listing: {
  business_name: string
  slug: string
  email: string
  view_count: number
  click_count: number
}) {
  const listingUrl = `${SITE}/listings/${listing.slug}`
  const isPopular = listing.view_count >= 50

  await sgMail.send({
    to: listing.email,
    from: { email: FROM, name: 'SafferBiz' },
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
  })
}
