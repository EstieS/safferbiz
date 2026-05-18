'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { Listing } from '@/lib/types'

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

export default function NearMePage() {
  const [status, setStatus] = useState<Status>('idle')
  const [listings, setListings] = useState<ListingWithDistance[]>([])
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
          setStatus('done')
        } catch {
          setErrorMsg('Failed to load listings. Please try again.')
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

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">📍 Closest to Me</h1>
        <p className="text-gray-500">
          Find South African businesses near your current location.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 mb-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <p className="text-sm font-medium text-gray-700">Search radius</p>
              {/* km / miles toggle */}
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
            <div className="flex gap-2">
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
            {status === 'loading' && <>🔍 Finding businesses...</>}
            {(status === 'idle' || status === 'done' || status === 'error') && <>📍 Find businesses near me</>}
          </button>
        </div>

        {status === 'error' && (
          <p className="mt-4 text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>
        )}
      </div>

      {status === 'done' && (
        <>
          <p className="text-sm text-gray-500 mb-6">
            {(() => {
              const label = useMiles ? `${Math.round(radiusKm * KM_TO_MI)} mi` : `${radiusKm} km`
              return listings.length === 0
                ? `No SA businesses found within ${label}. Try increasing the radius.`
                : `${listings.length} ${listings.length === 1 ? 'business' : 'businesses'} found within ${label}`
            })()}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.slug}`} className="block group">
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-lg hover:border-green-400 transition-all h-full flex flex-col relative overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl" style={{ backgroundColor: '#007A4D' }} />
                  <div className="flex items-start gap-3 mb-3">
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
                      <p className="text-xs text-gray-500">
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
        </>
      )}

      {status === 'idle' && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🗺️</p>
          <p className="text-lg">Click the button above to find SA businesses near you</p>
          <p className="text-sm mt-2">Your location is only used to calculate distances — it is never stored.</p>
        </div>
      )}
    </div>
  )
}
