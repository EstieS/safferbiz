// Shared "is this the same business?" logic.
//
// Primary key: the website domain (a domain belongs to exactly one business).
// Fallback (no/!matching website): business name + country + city together —
// so the same name in different countries is NOT treated as a duplicate.

// Shared social / marketplace hosts — a link to one of these does NOT identify
// a unique business (many businesses link to facebook.com, etsy.com, etc.), so
// we ignore them as a uniqueness key and fall back to name + country + city.
const SHARED_DOMAINS = new Set([
  'facebook.com', 'm.facebook.com', 'fb.com', 'fb.me',
  'instagram.com', 'etsy.com', 'linktr.ee', 'linktree.com', 'beacons.ai',
  'wa.me', 'whatsapp.com', 'api.whatsapp.com',
  'twitter.com', 'x.com', 'tiktok.com', 'youtube.com', 'youtu.be',
  'pinterest.com', 'linkedin.com', 'google.com', 'goo.gl',
  'maps.google.com', 'business.google.com', 'sites.google.com', 'g.page',
])

export function normalizeDomain(url: string | null | undefined): string {
  if (!url) return ''
  const domain = url
    .toLowerCase()
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split(/[/?#]/)[0] // hostname only — drop path/query/hash
    .replace(/\/$/, '')
  return SHARED_DOMAINS.has(domain) ? '' : domain
}

export function normalizeText(t: string | null | undefined): string {
  return (t ?? '').toLowerCase().trim().replace(/\s+/g, ' ')
}

/** Key used to match businesses that have no shared domain. */
export function nameLocationKey(r: { business_name: string; country: string | null; city: string | null }): string {
  return `${normalizeText(r.business_name)}|${normalizeText(r.country)}|${normalizeText(r.city)}`
}

export interface DupRecord {
  id: string
  business_name: string
  website_url: string | null
  country: string | null
  city: string | null
}

/**
 * Returns a map of record id → names of OTHER records it may duplicate.
 * Two records match if they share a normalized domain, or the same
 * name + country + city.
 */
export function findDuplicates<T extends DupRecord>(records: T[]): Map<string, string[]> {
  const byDomain = new Map<string, T[]>()
  const byNameLoc = new Map<string, T[]>()

  const push = (m: Map<string, T[]>, key: string, r: T) => {
    const arr = m.get(key)
    if (arr) arr.push(r)
    else m.set(key, [r])
  }

  for (const r of records) {
    const domain = normalizeDomain(r.website_url)
    if (domain) push(byDomain, domain, r)
    if (normalizeText(r.business_name)) push(byNameLoc, nameLocationKey(r), r)
  }

  const result = new Map<string, string[]>()
  const link = (r: T, other: T) => {
    if (other.id === r.id) return
    const list = result.get(r.id) ?? []
    if (!list.includes(other.business_name)) list.push(other.business_name)
    result.set(r.id, list)
  }

  for (const group of [...byDomain.values(), ...byNameLoc.values()]) {
    if (group.length < 2) continue
    for (const r of group) for (const o of group) link(r, o)
  }

  return result
}
