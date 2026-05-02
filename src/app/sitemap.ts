import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase-server'
import { CATEGORIES, COUNTRIES } from '@/lib/constants'

const SITE = 'https://safferbiz.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()

  // Fetch all active listing slugs
  const { data: listings } = await admin
    .from('listings')
    .select('slug, updated_at')
    .eq('status', 'active')

  // Fetch all active event slugs
  const { data: events } = await admin
    .from('events')
    .select('slug, updated_at')
    .eq('status', 'active')

  const listingPages = (listings ?? []).map((l) => ({
    url: `${SITE}/listings/${l.slug}`,
    lastModified: l.updated_at ? new Date(l.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  const eventPages = (events ?? []).map((e) => ({
    url: `${SITE}/events/${e.slug}`,
    lastModified: e.updated_at ? new Date(e.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.6,
  }))

  const categoryPages = CATEGORIES.map((cat) => ({
    url: `${SITE}/category/${encodeURIComponent(cat.toLowerCase().replace(/ & /g, '-').replace(/ /g, '-'))}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  const countryPages = COUNTRIES.map((country) => ({
    url: `${SITE}/country/${encodeURIComponent(country.toLowerCase().replace(/ /g, '-'))}`,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }))

  return [
    { url: SITE, changeFrequency: 'daily', priority: 1.0 },
    { url: `${SITE}/about`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/submit`, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${SITE}/events`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${SITE}/subscribe`, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${SITE}/online`, changeFrequency: 'weekly', priority: 0.7 },
    ...categoryPages,
    ...countryPages,
    ...listingPages,
    ...eventPages,
  ]
}
