import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import ClaimForm from './ClaimForm'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  return { title: `Claim your listing — SafferBiz`, alternates: { canonical: `/claim/${slug}` } }
}

export default async function ClaimPage({ params }: Props) {
  const { slug } = await params
  const supabase = await createServerSupabaseClient()

  const { data: listing } = await supabase
    .from('listings')
    .select('business_name, slug, city, country, claimed_by_email')
    .eq('slug', slug)
    .eq('status', 'active')
    .single()

  if (!listing) notFound()

  const location = [listing.city, listing.country].filter(Boolean).join(', ')
  const alreadyClaimed = Boolean(listing.claimed_by_email)

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <Link href={`/listings/${slug}`} className="text-sm text-gray-500 hover:text-green-700 mb-6 inline-block">
        ← Back to listing
      </Link>

      <h1 className="text-2xl font-bold text-gray-900">Claim {listing.business_name}</h1>
      <p className="text-sm text-gray-500 mt-1">{location}</p>

      {alreadyClaimed ? (
        <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
          This listing has already been claimed by its owner. If you believe that's a mistake,
          please <a href="mailto:safferbiz@gmail.com" className="underline font-medium">email us</a>.
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm text-gray-600 leading-relaxed">
            Are you the owner? Claim this listing to get a <strong>✓ Verified</strong> badge and the
            ability to keep your details up to date yourself. We review every claim by hand, so
            tell us a little about your connection to the business.
          </p>
          <ClaimForm slug={slug} businessName={listing.business_name} />
        </>
      )}
    </div>
  )
}
