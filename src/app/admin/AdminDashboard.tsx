'use client'

import { useState } from 'react'
import type { Listing, ListingStatus } from '@/lib/types'
import { PRODUCT_TAGS } from '@/lib/constants'

const STATUS_COLORS: Record<ListingStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
}

function TagEditor({ listing, onSave }: { listing: Listing; onSave: (tags: string[]) => void }) {
  const [tags, setTags] = useState<string[]>(listing.tags ?? [])
  const [custom, setCustom] = useState('')

  function toggle(tag: string) {
    setTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag])
  }

  function addCustom() {
    const t = custom.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setCustom('')
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
      <p className="text-xs font-medium text-gray-500 mb-2">Products & Tags</p>
      <div className="flex flex-wrap gap-1 mb-2">
        {PRODUCT_TAGS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggle(tag)}
            className={`px-2 py-0.5 rounded-full text-xs border transition-colors ${
              tags.includes(tag)
                ? 'bg-amber-500 text-white border-amber-500'
                : 'bg-white text-gray-500 border-gray-300 hover:border-amber-400'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-2">
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom() } }}
          placeholder="Custom tag..."
          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded"
        />
        <button type="button" onClick={addCustom} className="px-2 py-1 text-xs border border-gray-300 rounded hover:bg-gray-100">Add</button>
      </div>
      {tags.filter((t) => !PRODUCT_TAGS.includes(t as typeof PRODUCT_TAGS[number])).map((t) => (
        <span key={t} className="inline-flex items-center gap-1 mr-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
          {t}
          <button onClick={() => toggle(t)} className="hover:text-red-600">×</button>
        </span>
      ))}
      <div className="flex gap-2 mt-2">
        <button
          onClick={() => onSave(tags)}
          className="px-3 py-1 text-xs font-medium rounded text-white"
          style={{ backgroundColor: '#007A4D' }}
        >
          Save Tags
        </button>
      </div>
    </div>
  )
}

export default function AdminDashboard({ listings: initial }: { listings: Listing[] }) {
  const [listings, setListings] = useState(initial)
  const [filter, setFilter] = useState<ListingStatus | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [expandedTags, setExpandedTags] = useState<string | null>(null)

  const filtered = filter === 'all' ? listings : listings.filter((l) => l.status === filter)

  async function updateStatus(id: string, status: ListingStatus) {
    setBusy(id)
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)))
    setBusy(null)
  }

  async function saveTags(id: string, tags: string[]) {
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tags }),
    })
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, tags } : l)))
    setExpandedTags(null)
  }

  async function deleteListing(id: string) {
    if (!confirm('Delete this listing permanently?')) return
    setBusy(id)
    await fetch(`/api/admin/listings/${id}`, { method: 'DELETE' })
    setListings((prev) => prev.filter((l) => l.id !== id))
    setBusy(null)
  }

  const counts = {
    all: listings.length,
    pending: listings.filter((l) => l.status === 'pending').length,
    active: listings.filter((l) => l.status === 'active').length,
    inactive: listings.filter((l) => l.status === 'inactive').length,
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <form action="/api/auth/signout" method="post">
          <button className="text-sm text-gray-500 hover:text-red-600">Sign out</button>
        </form>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {(['all', 'pending', 'active', 'inactive'] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`p-4 rounded-xl border text-left transition-all ${
              filter === s ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
            <p className="text-sm text-gray-500 capitalize">{s}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No listings in this view.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((listing) => (
              <div key={listing.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[listing.status]}`}>
                        {listing.status}
                      </span>
                      <span className="text-xs text-gray-400">{listing.category}</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{listing.business_name}</p>
                    <p className="text-sm text-gray-500">
                      {listing.city ? `${listing.city}, ` : ''}{listing.country}
                      {listing.email ? ` · ${listing.email}` : ''}
                    </p>
                    {listing.description && (
                      <p className="text-xs text-gray-400 mt-1 line-clamp-1">{listing.description}</p>
                    )}
                    {(listing.tags ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {(listing.tags ?? []).map((tag) => (
                          <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {listing.status !== 'active' && (
                      <button
                        onClick={() => updateStatus(listing.id, 'active')}
                        disabled={busy === listing.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                        style={{ backgroundColor: '#007A4D' }}
                      >
                        Approve
                      </button>
                    )}
                    {listing.status !== 'inactive' && (
                      <button
                        onClick={() => updateStatus(listing.id, 'inactive')}
                        disabled={busy === listing.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                      >
                        Deactivate
                      </button>
                    )}
                    <button
                      onClick={() => setExpandedTags(expandedTags === listing.id ? null : listing.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Tags
                    </button>
                    {listing.website_url && (
                      <a
                        href={listing.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        Visit
                      </a>
                    )}
                    <button
                      onClick={() => deleteListing(listing.id)}
                      disabled={busy === listing.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {expandedTags === listing.id && (
                  <TagEditor listing={listing} onSave={(tags) => saveTags(listing.id, tags)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
