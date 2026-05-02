import { NextRequest, NextResponse } from 'next/server'
import sgMail from '@sendgrid/mail'

sgMail.setApiKey(process.env.SENDGRID_API_KEY!)

export async function POST(req: NextRequest) {
  try {
    const { message, email } = await req.json()

    if (!message?.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    await sgMail.send({
      to: 'safferbiz@gmail.com',
      from: { email: process.env.SENDGRID_FROM_EMAIL!, name: 'SafferBiz' },
      subject: `💬 New feedback on SafferBiz`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: #007A4D; padding: 24px; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Saffer<span style="color: #FFB612;">Biz</span></h1>
          </div>
          <div style="padding: 32px 24px;">
            <p style="color: #555; margin-top: 0;">Someone left feedback on SafferBiz:</p>

            <div style="background: #f9f9f9; border-left: 4px solid #007A4D; padding: 20px; border-radius: 4px; margin: 24px 0;">
              <p style="margin: 0; color: #111; font-size: 15px; white-space: pre-wrap;">${message.trim()}</p>
            </div>

            ${email?.trim()
              ? `<p style="color: #555; font-size: 14px;">✉️ Reply to: <a href="mailto:${email.trim()}" style="color: #007A4D;">${email.trim()}</a></p>`
              : `<p style="color: #999; font-size: 14px; font-style: italic;">No email provided.</p>`
            }
          </div>
        </div>
      `,
      ...(email?.trim() ? { replyTo: email.trim() } : {}),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Feedback error:', err)
    return NextResponse.json({ error: 'Failed to send feedback' }, { status: 500 })
  }
}
