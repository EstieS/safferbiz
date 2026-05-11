import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Listing } from '@/lib/types'
import ViewTracker from '@/components/ViewTracker'
import ListingLinks from '@/components/ListingLinks'
import { getCountryFlag } from '@/lib/regions'

const POPULAR_THRESHOLD = 50

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()
  const { data } = await supabase
    .from('listings')
    .select('business_name, description, country, city, category, tags')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!data) return { title: 'Listing Not Found' }

  const location = [data.city, data.country].filter(Boolean).join(', ')
  const tags = (data.tags ?? []) as string[]
  const tagStr = tags.length ? ` — ${tags.slice(0, 3).join(', ')}` : ''
  const title = `${data.business_name} — South African ${data.category} in ${location}`
  const description =
    data.description?.slice(0, 155) ??
    `${data.business_name} is a South African ${data.category} business in ${location}${tagStr}. Found on SafferBiz.`
  const url = `https://safferbiz.com/listings/${slug}`

  return {
    title,
    description,
    openGraph: { title, description, url, type: 'website', siteName: 'SafferBiz' },
    twitter: { card: 'summary', title, description },
  }
}

export default async function ListingPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data } = await supabase
    .from('listings')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!data) notFound()

  const listing = data as Listing
  const location = listing.country === 'United States'
    ? [listing.city, listing.state, listing.country].filter(Boolean).join(', ')
    : [listing.city, listing.country].filter(Boolean).join(', ')
  const tags = [...(listing.tags ?? [])].sort()
  const isPopular = (listing.view_count ?? 0) >= POPULAR_THRESHOLD
  const flag = getCountryFlag(listing.country)

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <ViewTracker slug={slug} />

      <Link href="/" className="text-sm text-gray-500 hover:text-green-700 mb-6 inline-block">
        ← Back to listings
      </Link>

      <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <div className="flex items-start gap-6 mb-6">
          {listing.logo_url ? (
            <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
              <Image src={listing.logo_url} alt={listing.business_name} fill className="object-cover" />
            </div>
          ) : (
            <div
              className="w-20 h-20 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold text-3xl"
              style={{ backgroundColor: '#007A4D' }}
            >
              {listing.business_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0">
            {isPopular && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                  🔥 Popular
                </span>
              </div>
            )}
            <h1 className="text-3xl font-bold text-gray-900">{listing.business_name}</h1>
            <p className="text-base font-medium text-gray-600 mt-1 flex items-center gap-1.5">
              {flag
                ? <img src={flag} alt={listing.country} width={20} height={15} className="inline-block flex-shrink-0" />
                : <span>🌍</span>
              }
              {location}
            </p>
            <span
              className="inline-block mt-2 text-xs font-medium px-3 py-1 rounded-full"
              style={{ backgroundColor: '#007A4D20', color: '#007A4D' }}
            >
              {listing.category}
            </span>
          </div>
        </div>

        {listing.description && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-2 pl-3 border-l-4 border-green-500">About</h2>
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pl-3 border-l-4 border-green-500">Products & Services</h2>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Link
                  key={tag}
                  href={`/tag/${encodeURIComponent(tag)}`}
                  className="text-sm px-3 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
                >
                  {tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        <ListingLinks
          slug={slug}
          website_url={listing.website_url}
          email={listing.email}
          facebook_url={listing.facebook_url}
          instagram_url={listing.instagram_url}
        />
      </div>
    </div>
  )
}
