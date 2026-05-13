'use client'

import { useState } from 'react'
import type { Listing, ListingStatus, Event, EventStatus } from '@/lib/types'
import { PRODUCT_TAGS, CATEGORIES, COUNTRIES } from '@/lib/constants'

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

function ListingEditor({ listing, onSave }: { listing: Listing; onSave: (data: Partial<Listing>) => void }) {
  const [fields, setFields] = useState({
    business_name: listing.business_name ?? '',
    description: listing.description ?? '',
    category: listing.category ?? '',
    country: listing.country ?? '',
    city: listing.city ?? '',
    state: listing.state ?? '',
    website_url: listing.website_url ?? '',
    email: listing.email ?? '',
    facebook_url: listing.facebook_url ?? '',
    instagram_url: listing.instagram_url ?? '',
  })
  const [featureOnSocial, setFeatureOnSocial] = useState(listing.feature_on_social ?? false)

  function set(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <p className="text-xs font-medium text-gray-500 mb-2">Edit Listing Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">Business Name</label>
          <input value={fields.business_name} onChange={e => set('business_name', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Email</label>
          <input value={fields.email} onChange={e => set('email', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="contact@example.com" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Category</label>
          <select value={fields.category} onChange={e => set('category', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5 bg-white">
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">Country</label>
          <select value={fields.country} onChange={e => set('country', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5 bg-white">
            {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-400">City</label>
          <input value={fields.city} onChange={e => set('city', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" />
        </div>
        {fields.country === 'United States' && (
          <div>
            <label className="text-xs text-gray-400">State</label>
            <input value={fields.state} onChange={e => set('state', e.target.value)}
              className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="e.g. California" />
          </div>
        )}
        <div>
          <label className="text-xs text-gray-400">Website URL</label>
          <input value={fields.website_url} onChange={e => set('website_url', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs text-gray-400">Facebook URL</label>
          <input value={fields.facebook_url} onChange={e => set('facebook_url', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="https://facebook.com/..." />
        </div>
        <div>
          <label className="text-xs text-gray-400">Instagram URL</label>
          <input value={fields.instagram_url} onChange={e => set('instagram_url', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="https://instagram.com/..." />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400">Description</label>
        <textarea value={fields.description} onChange={e => set('description', e.target.value)}
          rows={2} className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5 resize-none" />
      </div>
      <div
        onClick={() => setFeatureOnSocial(!featureOnSocial)}
        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
          featureOnSocial ? 'border-pink-400 bg-pink-50' : 'border-gray-200 bg-white hover:border-pink-300'
        }`}
      >
        <div className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
          featureOnSocial ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
        }`}>
          {featureOnSocial && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <p className="text-xs text-gray-700">📱 Feature on SafferBiz social media</p>
      </div>
      <button onClick={() => onSave({ ...fields, feature_on_social: featureOnSocial })}
        className="px-3 py-1 text-xs font-medium rounded text-white"
        style={{ backgroundColor: '#007A4D' }}>
        Save Changes
      </button>
    </div>
  )
}

function EventEditor({ event, onSave }: { event: Event; onSave: (data: Partial<Event>) => void }) {
  const [fields, setFields] = useState({
    title: event.title ?? '',
    description: event.description ?? '',
    venue: event.venue ?? '',
    city: event.city ?? '',
    url: event.url ?? '',
    facebook_url: event.facebook_url ?? '',
    instagram_url: event.instagram_url ?? '',
  })

  function set(key: string, value: string) {
    setFields(prev => ({ ...prev, [key]: value }))
  }

  return (
    <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
      <p className="text-xs font-medium text-gray-500 mb-2">Edit Event Details</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-400">Title</label>
          <input value={fields.title} onChange={e => set('title', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-400">City</label>
          <input value={fields.city} onChange={e => set('city', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Venue</label>
          <input value={fields.venue} onChange={e => set('venue', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" />
        </div>
        <div>
          <label className="text-xs text-gray-400">Event / Tickets URL</label>
          <input value={fields.url} onChange={e => set('url', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="https://..." />
        </div>
        <div>
          <label className="text-xs text-gray-400">Facebook URL</label>
          <input value={fields.facebook_url} onChange={e => set('facebook_url', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="https://facebook.com/..." />
        </div>
        <div>
          <label className="text-xs text-gray-400">Instagram URL</label>
          <input value={fields.instagram_url} onChange={e => set('instagram_url', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5" placeholder="https://instagram.com/..." />
        </div>
      </div>
      <div>
        <label className="text-xs text-gray-400">Description</label>
        <textarea value={fields.description} onChange={e => set('description', e.target.value)}
          rows={2} className="w-full px-2 py-1 text-xs border border-gray-300 rounded mt-0.5 resize-none" />
      </div>
      <button onClick={() => onSave(fields)}
        className="px-3 py-1 text-xs font-medium rounded text-white"
        style={{ backgroundColor: '#007A4D' }}>
        Save Changes
      </button>
    </div>
  )
}

const EVENT_STATUS_COLORS: Record<EventStatus, string> = {
  active: 'bg-green-100 text-green-700',
  pending: 'bg-yellow-100 text-yellow-700',
  inactive: 'bg-gray-100 text-gray-500',
}

function EventsPanel({ events: initialEvents }: { events: Event[] }) {
  const [events, setEvents] = useState(initialEvents)
  const [filter, setFilter] = useState<EventStatus | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [expandedEdit, setExpandedEdit] = useState<string | null>(null)

  const filtered = (filter === 'all' ? events : events.filter((e) => e.status === filter))
    .slice().sort((a, b) => a.title.localeCompare(b.title))
  const counts = {
    all: events.length,
    pending: events.filter((e) => e.status === 'pending').length,
    active: events.filter((e) => e.status === 'active').length,
    inactive: events.filter((e) => e.status === 'inactive').length,
  }

  async function updateStatus(id: string, status: EventStatus) {
    setBusy(id)
    await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, status } : e)))
    setBusy(null)
  }

  async function saveEvent(id: string, data: Partial<Event>) {
    await fetch(`/api/admin/events/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...data } : e)))
    setExpandedEdit(null)
  }

  async function deleteEvent(id: string) {
    if (!confirm('Delete this event permanently?')) return
    setBusy(id)
    await fetch(`/api/admin/events/${id}`, { method: 'DELETE' })
    setEvents((prev) => prev.filter((e) => e.id !== id))
    setBusy(null)
  }

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {(['all', 'pending', 'active', 'inactive'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`p-4 rounded-xl border text-left transition-all ${filter === s ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
            <p className="text-sm text-gray-500 capitalize">{s}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-12">No events in this view.</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((event) => (
              <div key={event.id} className="p-5">
                <div className="flex flex-col sm:flex-row sm:items-start gap-4">

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${EVENT_STATUS_COLORS[event.status]}`}>{event.status}</span>
                      <span className="text-xs text-gray-400">{event.category}</span>
                      <span className="text-xs font-semibold text-red-600">{new Date(event.event_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                    <p className="font-semibold text-gray-900 truncate">{event.title}</p>
                    <p className="text-sm text-gray-500">
                      {[event.venue, event.city, event.country].filter(Boolean).join(', ')}
                      {event.organizer_name ? ` · ${event.organizer_name}` : ''}
                    </p>
                    {event.description && <p className="text-xs text-gray-400 mt-1 line-clamp-1">{event.description}</p>}
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    {event.status !== 'active' && (
                      <button onClick={() => updateStatus(event.id, 'active')} disabled={busy === event.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                        style={{ backgroundColor: '#007A4D' }}>Approve</button>
                    )}
                    {event.status !== 'inactive' && (
                      <button onClick={() => updateStatus(event.id, 'inactive')} disabled={busy === event.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">Deactivate</button>
                    )}
                    <button onClick={() => setExpandedEdit(expandedEdit === event.id ? null : event.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
                      Edit
                    </button>
                    {event.url && (
                      <a href={event.url} target="_blank" rel="noopener noreferrer"
                        className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">Link</a>
                    )}
                    <button onClick={() => deleteEvent(event.id)} disabled={busy === event.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50">Delete</button>
                  </div>
                </div>
                {expandedEdit === event.id && (
                  <EventEditor event={event} onSave={(data) => saveEvent(event.id, data)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function AdminDashboard({ listings: initial, events: initialEvents }: { listings: Listing[], events: Event[] }) {
  const [tab, setTab] = useState<'listings' | 'events'>('listings')
  const [listings, setListings] = useState(initial)
  const [filter, setFilter] = useState<ListingStatus | 'all'>('pending')
  const [busy, setBusy] = useState<string | null>(null)
  const [expandedTags, setExpandedTags] = useState<string | null>(null)
  const [expandedEdit, setExpandedEdit] = useState<string | null>(null)

  const filtered = (filter === 'all' ? listings : listings.filter((l) => l.status === filter))
    .slice().sort((a, b) => a.business_name.localeCompare(b.business_name))

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

  async function toggleOnline(id: string, sells_online: boolean) {
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sells_online }),
    })
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, sells_online } : l)))
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

  async function saveListing(id: string, data: Partial<Listing>) {
    await fetch(`/api/admin/listings/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    setListings((prev) => prev.map((l) => (l.id === id ? { ...l, ...data } : l)))
    setExpandedEdit(null)
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

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8">
        <button onClick={() => setTab('listings')}
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${tab === 'listings' ? 'text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          style={tab === 'listings' ? { backgroundColor: '#007A4D' } : {}}>
          🏪 Listings
        </button>
        <button onClick={() => setTab('events')}
          className={`px-5 py-2 rounded-lg font-medium text-sm transition-all ${tab === 'events' ? 'text-white bg-red-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
          🎉 Events
        </button>
      </div>

      {tab === 'events' && <EventsPanel events={initialEvents} />}
      {tab === 'listings' && <div>

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
                    <p className="text-xs text-gray-400 mt-0.5">
                      👁 {listing.view_count ?? 0} views · 🔗 {listing.click_count ?? 0} clicks
                      {(listing.view_count ?? 0) >= 50 && <span className="ml-1 text-orange-500 font-medium">🔥 Popular</span>}
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
                      onClick={() => toggleOnline(listing.id, !listing.sells_online)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                        listing.sells_online
                          ? 'bg-blue-500 text-white border-blue-500 hover:bg-blue-600'
                          : 'border-blue-300 text-blue-600 hover:bg-blue-50'
                      }`}
                    >
                      🛒 {listing.sells_online ? 'Online ✓' : 'Online?'}
                    </button>
                    <button
                      onClick={() => setExpandedTags(expandedTags === listing.id ? null : listing.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      Tags
                    </button>
                    <button
                      onClick={() => setExpandedEdit(expandedEdit === listing.id ? null : listing.id)}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
                    >
                      Edit
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
                {expandedEdit === listing.id && (
                  <ListingEditor listing={listing} onSave={(data) => saveListing(listing.id, data)} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      </div>}
    </div>
  )
}
