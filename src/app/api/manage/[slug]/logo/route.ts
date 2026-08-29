import { NextRequest, NextResponse } from 'next/server'
import { verifyManageToken } from '@/lib/manage-token'
import { setListingLogo, clearListingLogo } from '@/lib/listingLogo'

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const form = await req.formData()
  const token = form.get('token')

  const listing = await verifyManageToken(slug, typeof token === 'string' ? token : null)
  if (!listing) {
    return NextResponse.json({ error: 'Your management link has expired or is invalid.' }, { status: 403 })
  }

  const result = await setListingLogo(listing.id, form.get('file'))
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ logo_url: result.logo_url })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const { token } = await req.json()

  const listing = await verifyManageToken(slug, token)
  if (!listing) {
    return NextResponse.json({ error: 'Your management link has expired or is invalid.' }, { status: 403 })
  }

  const result = await clearListingLogo(listing.id)
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })

  return NextResponse.json({ success: true })
}
