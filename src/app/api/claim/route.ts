import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendClaimSubmittedNotification } from '@/lib/sendgrid'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { slug, claimant_name, claimant_email, message } = body

    if (!slug || !claimant_name?.trim() || !claimant_email?.trim()) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const email = claimant_email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Listing must exist and be live
    const { data: listing } = await supabase
      .from('listings')
      .select('id, business_name, slug, claimed_by_email')
      .eq('slug', slug)
      .eq('status', 'active')
      .single()

    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }

    if (listing.claimed_by_email) {
      return NextResponse.json(
        { error: 'This listing has already been claimed. Email us if that’s a mistake.' },
        { status: 409 }
      )
    }

    // Block duplicate pending claims from the same person for the same listing
    const { data: existing } = await supabase
      .from('listing_claims')
      .select('id')
      .eq('listing_id', listing.id)
      .eq('claimant_email', email)
      .eq('status', 'pending')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ success: true, alreadyPending: true })
    }

    const { error } = await supabase.from('listing_claims').insert({
      listing_id: listing.id,
      claimant_name: claimant_name.trim(),
      claimant_email: email,
      message: message?.trim() || null,
      status: 'pending',
    })

    if (error) throw error

    // Notify admin — best-effort
    try {
      await sendClaimSubmittedNotification({
        business_name: listing.business_name,
        slug: listing.slug,
        claimant_name: claimant_name.trim(),
        claimant_email: email,
        message: message?.trim() || null,
      })
    } catch (emailErr) {
      console.error('Failed to send claim notification:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Claim error:', err)
    return NextResponse.json({ error: 'Failed to submit claim' }, { status: 500 })
  }
}
