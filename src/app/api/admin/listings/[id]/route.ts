import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, createServerSupabaseClient } from '@/lib/supabase-server'
import { sendNewListingAlert } from '@/lib/sendgrid'

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

  const { error } = await admin.from('listings').update(body).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If approving a listing, send alerts to matching subscribers
  if (body.status === 'active') {
    try {
      // Fetch the full listing
      const { data: listing } = await admin
        .from('listings')
        .select('business_name, slug, category, city, country, description')
        .eq('id', id)
        .single()

      if (listing) {
        // Fetch matching subscribers:
        // - countries array is empty OR contains this listing's country
        // - categories array is empty OR contains this listing's category
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
      }
    } catch (emailErr) {
      // Don't fail the approval if email sending fails — just log it
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
