import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNewListingAlert, sendListingApprovedEmail } from '@/lib/sendgrid'
import { generateListingPost } from '@/lib/social-posts'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return user
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const admin = createAdminClient()

  // Stamp approved_at when approving so homepage can sort by it independently of updated_at
  const updateData = body.status === 'active'
    ? { ...body, approved_at: new Date().toISOString() }
    : body

  const { error } = await admin.from('listings').update(updateData).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If approving a listing, send alerts + generate social post draft
  if (body.status === 'active') {
    try {
      // Fetch the full listing
      const { data: listing } = await admin
        .from('listings')
        .select('business_name, slug, category, city, state, country, description, email, website_url, tags, sells_online, feature_on_social')
        .eq('id', id)
        .single()

      if (listing) {
        // Email the business owner
        if (listing.email) {
          await sendListingApprovedEmail({
            business_name: listing.business_name,
            slug: listing.slug,
            email: listing.email,
          }).catch(err => console.error('Failed to send approval email to business:', err))
        }

        // Alert matching subscribers
        const { data: subscribers } = await admin
          .from('subscribers')
          .select('name, email, unsubscribe_token, countries, categories')

        const matched = (subscribers ?? []).filter((sub) => {
          const countryMatch = !sub.countries?.length || sub.countries.includes(listing.country)
          const categoryMatch = !sub.categories?.length || sub.categories.includes(listing.category)
          return countryMatch && categoryMatch
        })

        if (matched.length > 0) {
          await sendNewListingAlert({ subscribers: matched, listing })
        }

        // Generate social post draft — only if business opted in to social features
        if (listing.feature_on_social) {
          generateListingPost(listing).catch(err =>
            console.error('Failed to generate social post draft:', err)
          )
        }
      }
    } catch (emailErr) {
      console.error('Failed to send listing alert emails:', emailErr)
    }
  }

  return NextResponse.json({ success: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const admin = createAdminClient()

  const { error } = await admin.from('listings').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
