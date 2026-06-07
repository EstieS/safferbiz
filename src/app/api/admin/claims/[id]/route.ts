import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { sendClaimApprovedEmail } from '@/lib/sendgrid'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://safferbiz.com'
const TOKEN_TTL_DAYS = 30

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user ?? null
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { action } = await req.json()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: claim } = await admin
    .from('listing_claims')
    .select('id, listing_id, claimant_email, status')
    .eq('id', id)
    .single()

  if (!claim) return NextResponse.json({ error: 'Claim not found' }, { status: 404 })

  // Mark the claim reviewed
  const { error: claimErr } = await admin
    .from('listing_claims')
    .update({ status: action === 'approve' ? 'approved' : 'rejected', reviewed_at: new Date().toISOString() })
    .eq('id', id)
  if (claimErr) return NextResponse.json({ error: claimErr.message }, { status: 500 })

  if (action === 'reject') {
    return NextResponse.json({ success: true, status: 'rejected' })
  }

  // Approve: verify the listing and record the owner
  const { data: listing, error: listErr } = await admin
    .from('listings')
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
      verified_via: 'owner_claim',
      claimed_by_email: claim.claimant_email,
    })
    .eq('id', claim.listing_id)
    .select('business_name, slug')
    .single()

  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 })

  // Mint a private edit token in the locked-down tokens table (one per listing)
  const manageToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
  const expires = new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()

  const { error: tokenErr } = await admin
    .from('listing_manage_tokens')
    .upsert({ listing_id: claim.listing_id, token: manageToken, expires_at: expires }, { onConflict: 'listing_id' })

  if (tokenErr) return NextResponse.json({ error: tokenErr.message }, { status: 500 })

  // Email the owner their private management link — best-effort
  try {
    await sendClaimApprovedEmail({
      business_name: listing.business_name,
      email: claim.claimant_email,
      manageUrl: `${SITE}/manage/${listing.slug}?token=${manageToken}`,
    })
  } catch (emailErr) {
    console.error('Failed to send claim approval email:', emailErr)
  }

  return NextResponse.json({ success: true, status: 'approved' })
}
