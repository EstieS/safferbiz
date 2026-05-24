'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Listing, Event } from '@/lib/types'

type Status = 'idle' | 'locating' | 'loading' | 'done' | 'error'

interface ListingWithDistance extends Listing {
  distanceKm: number
}

const KM_TO_MI = 0.621371

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function formatDistance(km: number, useMiles: boolean): string {
  if (useMiles) {
    const mi = km * KM_TO_MI
    if (mi < 0.1) return `${Math.round(mi * 5280)} ft away`
    if (mi < 10) return `${mi.toFixed(1)} mi away`
    return `${Math.round(mi)} mi away`
  }
  if (km < 1) return `${Math.round(km * 1000)} m away`
  if (km < 10) return `${km.toFixed(1)} km away`
  return `${Math.round(km)} km away`
}

function formatEventDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
}

export default function NearMePage() {
  const [status, setStatus] = useState<Status>('idle')
  const [listings, setListings] = useState<ListingWithDistance[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [errorMsg, setErrorMsg] = useState('')
  const [radiusKm, setRadiusKm] = useState(50)
  const [useMiles, setUseMiles] = useState(false)

  async function findNearMe() {
    setStatus('locating')
    setErrorMsg('')

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        setStatus('loading')

        try {
          // Fetch businesses with coordinates
          const res = await fetch('/api/listings/with-coords')
          const data: Listing[] = await res.json()

          const withDistance: ListingWithDistance[] = data
            .filter((l) => l.latitude != null && l.longitude != null)
            .map((l) => ({
              ...l,
              distanceKm: haversineKm(latitude, longitude, l.latitude!, l.longitude!),
            }))
            .filter((l) => l.distanceKm <= radiusKm)
            .sort((a, b) => a.distanceKm - b.distanceKm)

          setListings(withDistance)

          // Fetch upcoming events in the same countries as nearby businesses
          const nearbyCountries = [...new Set(withDistance.map((l) => l.country))]
          if (nearbyCountries.length > 0) {
            const params = nearbyCountries.map((c) => `countries=${encodeURIComponent(c)}`).join('&')
            const eventsRes = await fetch(`/api/events/nearby?${params}`)
            const eventsData: Event[] = await eventsRes.json()
            setEvents(eventsData)
          } else {
            setEvents([])
          }

          setStatus('done')
        } catch {
          setErrorMsg('Failed to load results. Please try again.')
          setStatus('error')
        }
      },
      (err) => {
        setErrorMsg(
          err.code === 1
            ? 'Location access was denied. Please allow location access in your browser and try again.'
            : 'Could not determine your location. Please try again.'
        )
        setStatus('error')
      }
    )
  }

  const radii = [10, 25, 50, 100, 250]
  const radiusLabel = useMiles ? `${Math.round(radiusKm * KM_TO_MI)} mi` : `${radiusKm} km`

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📍 Closest to Me</h1>
        <p className="text-gray-500">
          Find South African businesses and upcoming events near your current location.
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm font-medium text-gray-700">Search radius</p>
              <div className="flex rounded-full border border-gray-200 overflow-hidden text-xs font-medium">
                <button
                  onClick={() => setUseMiles(false)}
                  className={`px-3 py-1 transition-colors ${!useMiles ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  style={!useMiles ? { backgroundColor: '#007A4D' } : {}}
                >km</button>
                <button
                  onClick={() => setUseMiles(true)}
                  className={`px-3 py-1 transition-colors ${useMiles ? 'text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                  style={useMiles ? { backgroundColor: '#007A4D' } : {}}
                >mi</button>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {radii.map((r) => {
                const label = useMiles ? `${Math.round(r * KM_TO_MI)} mi` : `${r} km`
                return (
                  <button
                    key={r}
                    onClick={() => setRadiusKm(r)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                      radiusKm === r
                        ? 'text-white border-green-600'
                        : 'border-gray-200 text-gray-600 hover:border-green-400'
                    }`}
                    style={radiusKm === r ? { backgroundColor: '#007A4D' } : {}}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>

          <button
            onClick={findNearMe}
            disabled={status === 'locating' || status === 'loading'}
            className="sm:ml-auto px-6 py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60 transition-opacity flex items-center gap-2"
            style={{ backgroundColor: '#007A4D' }}
          >
            {status === 'locating' && <>📡 Getting your location...</>}
            {status === 'loading' && <>🔍 Searching...</>}
            {(status === 'idle' || status === 'done' || status === 'error') && <>📍 Find businesses & events near me</>}
          </button>
        </div>

        {status === 'error' && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>
        )}
      </div>

      {/* Results */}
      {status === 'done' && (
        <>
          {/* ── Businesses ── */}
          <div className="mb-10">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Businesses
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({listings.length} within {radiusLabel})
              </span>
            </h2>

            {listings.length === 0 ? (
              <p className="text-gray-400 py-6 text-sm">
                No SA businesses found within {radiusLabel}. Try increasing the radius.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                {listings.map((listing) => (
                  <Link key={listing.id} href={`/listings/${listing.slug}`} className="block group">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-lg hover:border-green-400 transition-all h-full flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: '#007A4D' }} />
                      <div className="flex items-start gap-3 mb-3 mt-1">
                        <div
                          className="w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: '#007A4D' }}
                        >
                          {listing.business_name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-green-700 transition-colors truncate text-sm">
                            {listing.business_name}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">
                            {listing.city ? `${listing.city}, ` : ''}{listing.country}
                          </p>
                        </div>
                      </div>

                      {listing.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 flex-1">{listing.description}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <span
                          className="text-xs font-medium px-2 py-1 rounded-full"
                          style={{ backgroundColor: '#007A4D20', color: '#007A4D' }}
                        >
                          {listing.category}
                        </span>
                        <span className="text-xs font-semibold text-green-700">
                          📍 {formatDistance(listing.distanceKm, useMiles)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ── Events ── */}
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              Upcoming Events
              <span className="ml-2 text-sm font-normal text-gray-400">
                ({events.length} in your area)
              </span>
            </h2>
            <p className="text-xs text-gray-400 mb-4">
              Events in the same {listings.length > 0 ? 'countr' + (new Set(listings.map(l => l.country)).size > 1 ? 'ies' : 'y') : 'region'} as nearby businesses
            </p>

            {events.length === 0 ? (
              <p className="text-gray-400 py-6 text-sm">
                No upcoming SA events found in your area.{' '}
                <Link href="/events" className="text-green-700 hover:underline">Browse all events →</Link>
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {events.map((event) => (
                  <Link key={event.id} href={`/events/${event.slug}`} className="block group">
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-lg hover:border-red-300 transition-all h-full flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: '#DE3831' }} />

                      {/* Date badge */}
                      <div className="flex items-start gap-3 mb-3 mt-1">
                        <div className="flex-shrink-0 text-center bg-red-50 border border-red-200 rounded-lg px-2 py-1 min-w-[48px]">
                          <p className="text-xs font-bold text-red-600 uppercase">
                            {new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', { month: 'short' })}
                          </p>
                          <p className="text-lg font-bold text-red-700 leading-none">
                            {new Date(event.event_date + 'T00:00:00').getDate()}
                          </p>
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-semibold text-gray-900 group-hover:text-red-700 transition-colors line-clamp-2 text-sm">
                            {event.title}
                          </h3>
                          <p className="text-xs text-gray-500 truncate mt-0.5">
                            {event.venue ? `${event.venue}, ` : ''}{event.city ? `${event.city}, ` : ''}{event.country}
                          </p>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 flex-1">{event.description}</p>
                      )}

                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
                          {event.category}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-red-600 transition-colors">
                          View →
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {status === 'idle' && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🗺️</p>
          <p className="text-lg">Click the button above to find SA businesses & events near you</p>
          <p className="text-sm mt-2">Your location is only used to calculate distances — it is never stored.</p>
        </div>
      )}
    </div>
  )
}
