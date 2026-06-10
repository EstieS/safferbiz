import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNewListingAlert, sendListingApprovedEmail, sendClaimInviteEmail } from '@/lib/sendgrid'
import { generateListingPost } from '@/lib/social-posts'

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://safferbiz.com'
const MANAGE_TOKEN_TTL_DAYS = 60

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
        .select('business_name, slug, category, city, state, country, description, email, website_url, tags, sells_online, feature_on_social, source, is_verified')
        .eq('id', id)
        .single()

      if (listing) {
        const fromForm = listing.source === 'owner' || listing.source === 'admin'

        if (fromForm) {
          // Form submissions (owner or admin-curated): verify on approval and
          // give the listing owner a private self-manage link.
          if (!listing.is_verified) {
            await admin.from('listings').update({
              is_verified: true,
              verified_at: new Date().toISOString(),
              verified_via: 'admin',
            }).eq('id', id)
          }

          let manageUrl: string | undefined
          try {
            const manageToken = crypto.randomUUID() + crypto.randomUUID().replace(/-/g, '')
            const expires = new Date(Date.now() + MANAGE_TOKEN_TTL_DAYS * 86400000).toISOString()
            const { error: tokenErr } = await admin
              .from('listing_manage_tokens')
              .upsert({ listing_id: id, token: manageToken, expires_at: expires }, { onConflict: 'listing_id' })
            if (!tokenErr) manageUrl = `${SITE}/manage/${listing.slug}?token=${manageToken}`
          } catch (tokenErr) {
            console.error('Failed to mint manage token:', tokenErr)
          }

          if (listing.email) {
            await sendListingApprovedEmail({
              business_name: listing.business_name,
              slug: listing.slug,
              email: listing.email,
              manageUrl,
            }).catch(err => console.error('Failed to send approval email to business:', err))
          }
        } else if (listing.email) {
          // AI-discovered: stays unverified — invite the owner to claim it
          await sendClaimInviteEmail({
            business_name: listing.business_name,
            slug: listing.slug,
            email: listing.email,
          }).catch(err => console.error('Failed to send claim invite:', err))
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
