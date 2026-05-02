import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import type { Listing } from '@/lib/types'

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
    openGraph: {
      title,
      description,
      url,
      type: 'website',
      siteName: 'SafferBiz',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
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
  const location = [listing.city, listing.country].filter(Boolean).join(', ')
  const tags = listing.tags ?? []

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
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

          <div>
            <h1 className="text-3xl font-bold text-gray-900">{listing.business_name}</h1>
            <p className="text-gray-500 mt-1">{location}</p>
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
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">About</h2>
            <p className="text-gray-700 leading-relaxed">{listing.description}</p>
          </div>
        )}

        {tags.length > 0 && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Products & Services</h2>
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

        <div className="border-t border-gray-100 pt-6 space-y-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Contact & Links</h2>

          {listing.website_url && (
            <a
              href={listing.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-green-700 hover:underline"
            >
              <span>🌐</span> {listing.website_url}
            </a>
          )}
          {listing.email && (
            <a href={`mailto:${listing.email}`} className="flex items-center gap-2 text-sm text-green-700 hover:underline">
              <span>✉️</span> {listing.email}
            </a>
          )}
          {listing.facebook_url && (
            <a
              href={listing.facebook_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
            >
              <span>📘</span> Facebook
            </a>
          )}
          {listing.instagram_url && (
            <a
              href={listing.instagram_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-pink-600 hover:underline"
            >
              <span>📷</span> Instagram
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
