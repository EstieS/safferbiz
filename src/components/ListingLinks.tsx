'use client'

import { useState } from 'react'

const SITE = 'https://safferbiz.com'

interface Props {
  slug: string
  businessName: string
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

export default function ListingLinks({ slug, businessName, website_url, email, facebook_url, instagram_url }: Props) {
  const [copied, setCopied] = useState(false)
  const shareUrl = `${SITE}/listings/${slug}`
  const shareText = `Check out ${businessName} on SafferBiz 🇿🇦`
  const message = `${shareText} ${shareUrl}`
  // wa.me opens WhatsApp; sms:?&body works on both iOS and Android
  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(message)}`
  const smsHref = `sms:?&body=${encodeURIComponent(message)}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard blocked — fall back to a prompt so the user can copy manually
      window.prompt('Copy this link:', shareUrl)
    }
  }

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

      {/* Share */}
      <div className="pt-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">Share this business</p>
        <div className="flex flex-wrap gap-2">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Share ${businessName} on WhatsApp`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#25D366' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.71.306 1.263.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.999-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
            </svg>
            WhatsApp
          </a>
          <a
            href={smsHref}
            aria-label={`Share ${businessName} via Messages`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#0A84FF' }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.486 2 2 5.937 2 10.75c0 2.36 1.08 4.502 2.84 6.073-.1 1.2-.49 2.62-1.31 3.67-.15.19-.04.47.2.46 1.78-.08 3.5-.78 4.84-1.66.74.18 1.52.28 2.33.28 5.514 0 10-3.937 10-8.75S17.514 2 12 2z"/>
            </svg>
            Messages
          </a>
          <button
            type="button"
            onClick={copyLink}
            aria-label={`Copy link to ${businessName}`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
              copied
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {copied ? (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                Copied!
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                Copy link
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
