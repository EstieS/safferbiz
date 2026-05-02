import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { slugify } from '@/lib/slugify'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { business_name, description, category, country, city, website_url, facebook_url, instagram_url, email, tags } = body

    if (!business_name || !description || !category || !country || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const baseSlug = slugify(business_name)
    const supabase = createAdminClient()

    // ensure unique slug
    let slug = baseSlug
    let suffix = 1
    while (true) {
      const { data } = await supabase.from('listings').select('id').eq('slug', slug).single()
      if (!data) break
      slug = `${baseSlug}-${suffix++}`
    }

    const { error } = await supabase.from('listings').insert({
      business_name: business_name.trim(),
      slug,
      description: description.trim(),
      category,
      country,
      city: city?.trim() || null,
      website_url: website_url?.trim() || null,
      facebook_url: facebook_url?.trim() || null,
      instagram_url: instagram_url?.trim() || null,
      email: email.trim(),
      tags: Array.isArray(tags) ? tags : [],
      status: 'pending',
    })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Failed to submit listing' }, { status: 500 })
  }
}
