import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { slugify } from '@/lib/slugify'
import { sendNewSubmissionNotification } from '@/lib/sendgrid'

async function geocodeCity(city: string, country: string): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const q = encodeURIComponent(`${city}, ${country}`)
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: { 'User-Agent': 'SafferBiz/1.0 (safferbiz.vercel.app)' },
    })
    const data = await res.json()
    if (!data.length) return null
    return { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) }
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { business_name, description, category, country, city, website_url, facebook_url, instagram_url, email, tags, sells_online } = body

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

    // Auto-geocode if city is provided (best-effort, won't block submission if it fails)
    const cityTrimmed = city?.trim() || null
    let coords: { latitude: number; longitude: number } | null = null
    if (cityTrimmed) {
      coords = await geocodeCity(cityTrimmed, country)
    }

    const { error } = await supabase.from('listings').insert({
      business_name: business_name.trim(),
      slug,
      description: description.trim(),
      category,
      country,
      city: cityTrimmed,
      website_url: website_url?.trim() || null,
      facebook_url: facebook_url?.trim() || null,
      instagram_url: instagram_url?.trim() || null,
      email: email.trim(),
      tags: Array.isArray(tags) ? tags : [],
      sells_online: sells_online === true,
      latitude: coords?.latitude ?? null,
      longitude: coords?.longitude ?? null,
      status: 'pending',
      source: 'owner',
    })

    if (error) throw error

    // Notify admin — best-effort, don't fail the submission if this errors
    try {
      await sendNewSubmissionNotification({
        business_name: business_name.trim(),
        category,
        city: cityTrimmed,
        country,
        email: email.trim(),
      })
    } catch (emailErr) {
      console.error('Failed to send submission notification:', emailErr)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Submit error:', err)
    return NextResponse.json({ error: 'Failed to submit listing' }, { status: 500 })
  }
}
