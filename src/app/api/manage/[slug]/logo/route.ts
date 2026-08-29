import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { verifyManageToken } from '@/lib/manage-token'

const BUCKET = 'listing-logos'
const MAX_BYTES = 512 * 1024
const ALLOWED = new Set(['image/webp', 'image/jpeg', 'image/png'])

// One object per listing, deterministic path — an upload overwrites the previous
// logo, so nothing accumulates.
const objectPath = (listingId: string) => `logos/${listingId}`

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const form = await req.formData()
    const token = form.get('token')
    const file = form.get('file')

    const listing = await verifyManageToken(slug, typeof token === 'string' ? token : null)
    if (!listing) {
      return NextResponse.json({ error: 'Your management link has expired or is invalid.' }, { status: 403 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No image received.' }, { status: 400 })
    }
    if (!ALLOWED.has(file.type)) {
      return NextResponse.json({ error: 'Please upload a JPG, PNG or WebP image.' }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'That image is too large. Please use one under 500 KB.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadErr } = await admin.storage.from(BUCKET).upload(objectPath(listing.id), buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: true,
    })
    if (uploadErr) throw uploadErr

    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath(listing.id))
    // Cache-buster so browsers and the Next image optimizer pick up the new file.
    const logo_url = `${pub.publicUrl}?v=${Date.now()}`

    const { error: updateErr } = await admin.from('listings').update({ logo_url }).eq('id', listing.id)
    if (updateErr) throw updateErr

    return NextResponse.json({ logo_url })
  } catch (err) {
    console.error('Logo upload error:', err)
    return NextResponse.json({ error: 'Failed to upload logo.' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params
    const { token } = await req.json()

    const listing = await verifyManageToken(slug, token)
    if (!listing) {
      return NextResponse.json({ error: 'Your management link has expired or is invalid.' }, { status: 403 })
    }

    const admin = createAdminClient()

    const { error: removeErr } = await admin.storage.from(BUCKET).remove([objectPath(listing.id)])
    if (removeErr) throw removeErr

    const { error: updateErr } = await admin.from('listings').update({ logo_url: null }).eq('id', listing.id)
    if (updateErr) throw updateErr

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Logo delete error:', err)
    return NextResponse.json({ error: 'Failed to remove logo.' }, { status: 500 })
  }
}
