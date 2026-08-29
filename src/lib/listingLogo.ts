import { createAdminClient } from './supabase-server'

// Shared logo storage logic for both the owner manage form
// (/api/manage/[slug]/logo) and the admin dashboard
// (/api/admin/listings/[id]/logo).

const BUCKET = 'listing-logos'
const MAX_BYTES = 512 * 1024
const ALLOWED = new Set(['image/webp', 'image/jpeg', 'image/png'])

// One object per listing, deterministic path — an upload overwrites the previous
// logo, so nothing accumulates.
const objectPath = (listingId: string) => `logos/${listingId}`

export type LogoResult =
  | { ok: true; logo_url: string | null }
  | { ok: false; error: string; status: number }

export async function setListingLogo(listingId: string, file: unknown): Promise<LogoResult> {
  if (!(file instanceof File)) {
    return { ok: false, error: 'No image received.', status: 400 }
  }
  if (!ALLOWED.has(file.type)) {
    return { ok: false, error: 'Please upload a JPG, PNG or WebP image.', status: 400 }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'That image is too large. Please use one under 500 KB.', status: 400 }
  }

  const admin = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadErr } = await admin.storage.from(BUCKET).upload(objectPath(listingId), buffer, {
    contentType: file.type,
    cacheControl: '31536000',
    upsert: true,
  })
  if (uploadErr) {
    console.error('Logo upload error:', uploadErr)
    return { ok: false, error: 'Failed to upload logo.', status: 500 }
  }

  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath(listingId))
  // Cache-buster so browsers and the Next image optimizer pick up the new file.
  const logo_url = `${pub.publicUrl}?v=${Date.now()}`

  const { error: updateErr } = await admin.from('listings').update({ logo_url }).eq('id', listingId)
  if (updateErr) {
    console.error('Logo save error:', updateErr)
    return { ok: false, error: 'Failed to save logo.', status: 500 }
  }

  return { ok: true, logo_url }
}

export async function clearListingLogo(listingId: string): Promise<LogoResult> {
  const admin = createAdminClient()

  const { error: removeErr } = await admin.storage.from(BUCKET).remove([objectPath(listingId)])
  if (removeErr) {
    console.error('Logo remove error:', removeErr)
    return { ok: false, error: 'Failed to remove logo.', status: 500 }
  }

  const { error: updateErr } = await admin.from('listings').update({ logo_url: null }).eq('id', listingId)
  if (updateErr) {
    console.error('Logo clear error:', updateErr)
    return { ok: false, error: 'Failed to remove logo.', status: 500 }
  }

  return { ok: true, logo_url: null }
}
