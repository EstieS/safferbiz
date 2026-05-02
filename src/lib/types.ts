export type ListingStatus = 'active' | 'pending' | 'inactive'

export interface Listing {
  id: string
  business_name: string
  slug: string
  description: string | null
  category: string
  country: string
  city: string | null
  website_url: string | null
  facebook_url: string | null
  instagram_url: string | null
  logo_url: string | null
  email: string | null
  status: ListingStatus
  tags: string[]
  sells_online: boolean
  latitude: number | null
  longitude: number | null
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
