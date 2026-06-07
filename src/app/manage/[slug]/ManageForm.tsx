'use client'

import { useState } from 'react'
import type { Listing } from '@/lib/types'
import { CATEGORIES, COUNTRIES, PRODUCT_TAGS } from '@/lib/constants'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function ManageForm({ listing, token }: { listing: Listing; token: string }) {
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [tags, setTags] = useState<string[]>(listing.tags ?? [])
  const [customTag, setCustomTag] = useState('')
  const [sellsOnline, setSellsOnline] = useState(listing.sells_online ?? false)
  const [fields, setFields] = useState({
    business_name: listing.business_name ?? '',
    description: listing.description ?? '',
    category: listing.category ?? '',
    country: listing.country ?? '',
    city: listing.city ?? '',
    state: listing.state ?? '',
    website_url: listing.website_url ?? '',
    facebook_url: listing.facebook_url ?? '',
    instagram_url: listing.instagram_url ?? '',
    email: listing.email ?? '',
  })

  // Clear the "Saved" / error state as soon as the owner edits again
  function touched() {
    setState((s) => (s === 'idle' || s === 'loading' ? s : 'idle'))
  }

  function set(key: string, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }))
    touched()
  }

  function toggleTag(tag: string) {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))
    touched()
  }

  function addCustomTag() {
    const t = customTag.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setCustomTag('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')
    try {
      const res = await fetch(`/api/manage/${listing.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, ...fields, tags, sells_online: sellsOnline }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong')
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  const input = 'w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500'
  const label = 'block text-sm font-medium text-gray-700 mb-1'

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className={label}>Business Name <span className="text-red-500">*</span></label>
        <input required value={fields.business_name} onChange={(e) => set('business_name', e.target.value)} className={input} />
      </div>

      <div>
        <label className={label}>Description</label>
        <textarea rows={4} value={fields.description} onChange={(e) => set('description', e.target.value)} className={`${input} resize-none`} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label}>Category</label>
          <select value={fields.category} onChange={(e) => set('category', e.target.value)} className={`${input} bg-white`}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Country</label>
          <select value={fields.country} onChange={(e) => set('country', e.target.value)} className={`${input} bg-white`}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>City</label>
          <input value={fields.city} onChange={(e) => set('city', e.target.value)} className={input} />
        </div>
        {fields.country === 'United States' && (
          <div>
            <label className={label}>State</label>
            <input value={fields.state} onChange={(e) => set('state', e.target.value)} className={input} />
          </div>
        )}
      </div>

      <div
        onClick={() => { setSellsOnline(!sellsOnline); touched() }}
        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
          sellsOnline ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 bg-white'
        }`}
      >
        <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${sellsOnline ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
          {sellsOnline && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <p className="text-sm font-medium text-gray-800">🛒 This business accepts online orders</p>
      </div>

      <div>
        <label className={label}>Products &amp; Services</label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRODUCT_TAGS.map((tag) => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                tags.includes(tag) ? 'bg-amber-500 text-white border-amber-500' : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
              }`}>
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={customTag} onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            placeholder="Add your own product/service..." className={input} />
          <button type="button" onClick={addCustomTag} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Add</button>
        </div>
        {tags.filter((t) => !PRODUCT_TAGS.includes(t as typeof PRODUCT_TAGS[number])).length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.filter((t) => !PRODUCT_TAGS.includes(t as typeof PRODUCT_TAGS[number])).map((t) => (
              <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800">
                {t}
                <button type="button" onClick={() => toggleTag(t)} className="hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className={label}>Website URL</label>
        <input type="url" value={fields.website_url} onChange={(e) => set('website_url', e.target.value)} className={input} placeholder="https://yourbusiness.com" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className={label}>Facebook URL</label>
          <input type="url" value={fields.facebook_url} onChange={(e) => set('facebook_url', e.target.value)} className={input} placeholder="https://facebook.com/..." />
        </div>
        <div>
          <label className={label}>Instagram URL</label>
          <input type="url" value={fields.instagram_url} onChange={(e) => set('instagram_url', e.target.value)} className={input} placeholder="https://instagram.com/..." />
        </div>
      </div>

      <div>
        <label className={label}>Contact Email</label>
        <input type="email" value={fields.email} onChange={(e) => set('email', e.target.value)} className={input} />
        <p className="text-xs text-gray-400 mt-1">Not shown publicly. Used only for listing correspondence.</p>
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>
      )}

      {state === 'success' && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 px-4 py-3 rounded-lg font-medium">
          ✓ Saved! Your listing has been updated — changes are live now.
        </p>
      )}

      <button type="submit" disabled={state === 'loading'}
        className={`w-full py-3 rounded-xl text-white font-semibold text-sm transition-colors disabled:opacity-60 ${state === 'success' ? 'bg-green-600' : ''}`}
        style={state === 'success' ? undefined : { backgroundColor: '#007A4D' }}>
        {state === 'loading' ? 'Saving...' : state === 'success' ? '✓ Saved' : 'Save Changes'}
      </button>
    </form>
  )
}
