import { createAdminClient } from './supabase-server'
import type { Listing } from './types'

/**
 * Verify an owner's private management token for a listing.
 *
 * Returns the full listing row when the token is valid and unexpired, otherwise
 * null. The tokens table is service-role only (no public RLS policy), so this
 * must run server-side.
 */
export async function verifyManageToken(
  slug: string,
  token: string | null | undefined,
): Promise<Listing | null> {
  if (!token) return null

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!listing) return null

  const { data: tokenRow } = await admin
    .from('listing_manage_tokens')
    .select('token, expires_at')
    .eq('listing_id', listing.id)
    .single()

  const valid =
    tokenRow &&
    tokenRow.token === token &&
    new Date(tokenRow.expires_at).getTime() > Date.now()

  return valid ? (listing as Listing) : null
}
