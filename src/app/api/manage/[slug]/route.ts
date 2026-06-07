import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Fields an owner is allowed to edit. Deliberately excludes status, is_verified,
// verified_*, view_count, click_count, slug, claimed_by_email, etc.
const EDITABLE = [
  'business_name', 'description', 'category', 'country', 'city', 'state',
  'website_url', 'facebook_url', 'instagram_url', 'email',
] as const

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const body = await req.json()
    const { token } = body

    if (!token) return NextResponse.json({ error: 'Missing management token' }, { status: 401 })

    const admin = createAdminClient()

    const { data: listing } = await admin
      .from('listings')
      .select('id')
      .eq('slug', slug)
      .single()

    if (!listing) return NextResponse.json({ error: 'Listing not found' }, { status: 404 })

    const { data: tokenRow } = await admin
      .from('listing_manage_tokens')
      .select('token, expires_at')
      .eq('listing_id', listing.id)
      .single()

    const valid =
      tokenRow &&
      tokenRow.token === token &&
      new Date(tokenRow.expires_at).getTime() > Date.now()

    if (!valid) {
      return NextResponse.json({ error: 'Your management link has expired or is invalid.' }, { status: 403 })
    }

    // Build a whitelisted update payload
    const update: Record<string, unknown> = {}
    for (const key of EDITABLE) {
      if (key in body) {
        const v = typeof body[key] === 'string' ? body[key].trim() : body[key]
        update[key] = v === '' ? null : v
      }
    }
    if (!update.business_name) {
      return NextResponse.json({ error: 'Business name is required' }, { status: 400 })
    }
    if (Array.isArray(body.tags)) update.tags = body.tags
    if (typeof body.sells_online === 'boolean') update.sells_online = body.sells_online

    const { error } = await admin.from('listings').update(update).eq('id', listing.id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Manage update error:', err)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}
