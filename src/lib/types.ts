export type ListingStatus = 'active' | 'pending' | 'inactive'

export interface Listing {
  id: string
  business_name: string
  slug: string
  description: string | null
  category: string
  country: string
  city: string | null
  state: string | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  logo_url: string | null
  email: string | null
  status: ListingStatus
  tags: string[]
  sells_online: boolean
  feature_on_social: boolean
  view_count: number
  click_count: number
  latitude: number | null
  longitude: number | null
  is_verified: boolean
  verified_at: string | null
  verified_via: 'admin' | 'owner_claim' | null
  claimed_by_email: string | null
  created_at: string
  updated_at: string
}

export type ClaimStatus = 'pending' | 'approved' | 'rejected'

export interface ListingClaim {
  id: string
  listing_id: string
  claimant_name: string
  claimant_email: string
  message: string | null
  status: ClaimStatus
  created_at: string
  reviewed_at: string | null
  // Joined from listings for admin display
  business_name?: string
  slug?: string
}

export type EventStatus = 'active' | 'pending' | 'inactive'

export interface Event {
  id: string
  title: string
  slug: string
  description: string | null
  event_date: string
  event_end_date: string | null
  event_time: string | null
  venue: string | null
  city: string | null
  country: string
  url: string | null
  facebook_url: string | null
  instagram_url: string | null
  organizer_name: string | null
  organizer_email: string | null
  organizer_phone: string | null
  category: string
  listing_id: string | null
  status: EventStatus
  created_at: string
  updated_at: string
}

export interface ListingFormData {
  business_name: string
  description: string
  category: string
  country: string
  city: string
  website_url: string
  facebook_url: string
  instagram_url: string
  email: string
}
