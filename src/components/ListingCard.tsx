import Link from 'next/link'
import Image from 'next/image'
import type { Listing } from '@/lib/types'
import { getRegionColor, getCountryFlag } from '@/lib/regions'

const POPULAR_THRESHOLD = 50

interface Props {
  listing: Listing
}

export default function ListingCard({ listing }: Props) {
  const tags = [...(listing.tags ?? [])].sort()
  const isPopular = (listing.view_count ?? 0) >= POPULAR_THRESHOLD
  const regionColor = getRegionColor(listing.country)
  const flag = getCountryFlag(listing.country)

  const locationParts = [
    listing.city,
    listing.country === 'United States' && listing.state ? listing.state : null,
    listing.country,
  ].filter(Boolean)
  const location = locationParts.join(', ')

  return (
    <Link href={`/listings/${listing.slug}`} className="block group">
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-lg hover:border-green-400 transition-all h-full flex flex-col relative overflow-hidden">

        {/* Regional colour stripe — SA flag colour based on country */}
        <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl" style={{ backgroundColor: regionColor }} />

        <div className="flex items-start gap-3 mb-3 mt-1">
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
              style={{ backgroundColor: regionColor }}
            >
              {listing.business_name.charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            {isPopular && (
              <div className="mb-0.5">
                <span className="inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                  🔥 Popular
                </span>
              </div>
            )}
            <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate">
              {listing.business_name}
            </h3>
            {/* Location — flag image + city/country, more prominent */}
            <p className="text-sm font-medium text-gray-600 mt-0.5 truncate flex items-center gap-1.5">
              {flag
                ? <img src={flag} alt={listing.country} width={20} height={15} className="inline-block flex-shrink-0" />
                : <span>🌍</span>
              }
              {location}
            </p>
          </div>
        </div>

        {listing.description && (
          <p className="text-sm text-gray-500 line-clamp-2 flex-1">{listing.description}</p>
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
              style={{ backgroundColor: `${regionColor}18`, color: regionColor }}
            >
              {listing.category}
            </span>
            {listing.sells_online && (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                🛒 Online
              </span>
            )}
          </div>
          <span className="flex items-center gap-2 text-xs text-gray-400">
            {(listing.view_count ?? 0) > 0 && (
              <span title="Total views">
                👁 {(listing.view_count ?? 0) >= 1000
                  ? `${((listing.view_count ?? 0) / 1000).toFixed(1)}k`
                  : listing.view_count}
              </span>
            )}
            <span className="group-hover:text-green-600 transition-colors">View →</span>
          </span>
        </div>
      </div>
    </Link>
  )
}
