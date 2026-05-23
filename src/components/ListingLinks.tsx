'use client'

interface Props {
  slug: string
  website_url: string | null
  email: string | null
  facebook_url: string | null
  instagram_url: string | null
}

function trackClick(slug: string) {
  fetch(`/api/listings/${slug}/click`, { method: 'POST', keepalive: true }).catch(() => {})
}

/** Ensures a URL has a protocol so it opens as an external link, not a relative path */
function ensureHttps(url: string): string {
  if (!url) return url
  return /^https?:\/\//i.test(url) ? url : `https://${url}`
}

export default function ListingLinks({ slug, website_url, email, facebook_url, instagram_url }: Props) {
  return (
    <div className="border-t border-gray-100 pt-6 space-y-3">
      <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pl-3 border-l-4 border-green-500">
        Contact & Links
      </h2>

      {website_url && (
        <a
          href={ensureHttps(website_url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(slug)}
          className="flex items-center gap-2 text-sm text-green-700 hover:underline"
        >
          <span>🌐</span> {website_url}
        </a>
      )}
      {email && (
        <a
          href={`mailto:${email}`}
          onClick={() => trackClick(slug)}
          className="flex items-center gap-2 text-sm text-green-700 hover:underline"
        >
          <span>✉️</span> {email}
        </a>
      )}
      {facebook_url && (
        <a
          href={ensureHttps(facebook_url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(slug)}
          className="flex items-center gap-2 text-sm text-blue-600 hover:underline"
        >
          <span>📘</span> Facebook
        </a>
      )}
      {instagram_url && (
        <a
          href={ensureHttps(instagram_url)}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackClick(slug)}
          className="flex items-center gap-2 text-sm text-pink-600 hover:underline"
        >
          <span>📷</span> Instagram
        </a>
      )}
    </div>
  )
}
