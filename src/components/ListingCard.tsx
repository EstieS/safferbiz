import Link from 'next/link'
import Image from 'next/image'
import type { Listing } from '@/lib/types'

interface Props {
  listing: Listing
}

export default function ListingCard({ listing }: Props) {
  const tags = listing.tags ?? []

  return (
    <Link href={`/listings/${listing.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-lg hover:border-green-400 transition-all h-full flex flex-col relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: '#007A4D' }} />
        <div className="flex items-start gap-3 mb-3">
          {listing.logo_url ? (
            <div className="relative w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
              <Image
                src={listing.logo_url}
                alt={listing.business_name}
                fill
                className="object-cover"
              />
            </div>
          ) : (
            <div
              className="w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: '#007A4D' }}
            >
              {listing.business_name.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
              {listing.business_name}
            </h3>
            <p className="text-xs text-gray-500">
              {listing.city ? `${listing.city}, ` : ''}
              {listing.country === 'United States' && listing.state ? `${listing.state}, ` : ''}
              {listing.country}
            </p>
          </div>
        </div>

        {listing.description && (
          <p className="text-sm text-gray-600 line-clamp-2 flex-1">{listing.description}</p>
        )}

        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-3 flex items-center justify-between flex-wrap gap-1">
          <div className="flex items-center gap-1 flex-wrap">
            <span
              className="text-xs font-medium px-2 py-1 rounded-full"
              style={{ backgroundColor: '#007A4D20', color: '#007A4D' }}
            >
              {listing.category}
            </span>
            {listing.sells_online && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                🛒 Online
              </span>
            )}
          </div>
          <span className="text-xs text-gray-400 group-hover:text-green-600 transition-colors">
            View →
          </span>
        </div>
      </div>
    </Link>
  )
}
