'use client'

import { useState } from 'react'
import { CATEGORIES, COUNTRIES, PRODUCT_TAGS } from '@/lib/constants'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function SubmitForm() {
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [customTag, setCustomTag] = useState('')
  const [sellsOnline, setSellsOnline] = useState(false)
  const [selectedCountry, setSelectedCountry] = useState('')

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function addCustomTag() {
    const t = customTag.trim()
    if (t && !selectedTags.includes(t)) {
      setSelectedTags((prev) => [...prev, t])
    }
    setCustomTag('')
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, tags: selectedTags, sells_online: sellsOnline }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Submission failed')
      setState('success')
      form.reset()
      setSelectedTags([])
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="text-center py-12 bg-white rounded-2xl border border-gray-200 p-8">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Submission Received!</h2>
        <p className="text-gray-600">
          Your listing will be reviewed and published within 24–48 hours.
          We&apos;ll be in touch if we need more details.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Business Name <span className="text-red-500">*</span>
        </label>
        <input
          name="business_name"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          placeholder="e.g. The Biltong Shop Melbourne"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description <span className="text-red-500">*</span>
        </label>
        <textarea
          name="description"
          required
          rows={4}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500 resize-none"
          placeholder="Tell us about your business, what you sell or offer..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            name="category"
            required
            defaultValue=""
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white"
          >
            <option value="" disabled>Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Country <span className="text-red-500">*</span>
          </label>
          <select
            name="country"
            required
            defaultValue=""
            onChange={e => setSelectedCountry(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500 bg-white"
          >
            <option value="" disabled>Select a country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      <div className={`grid gap-5 ${selectedCountry === 'United States' ? 'grid-cols-1 sm:grid-cols-2' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
          <input
            name="city"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            placeholder="e.g. Los Angeles"
          />
        </div>
        {selectedCountry === 'United States' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
            <input
              name="state"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
              placeholder="e.g. California"
            />
          </div>
        )}
      </div>

      <div
        onClick={() => setSellsOnline(!sellsOnline)}
        className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
          sellsOnline ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 bg-white'
        }`}
      >
        <div className={`mt-0.5 w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
          sellsOnline ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
        }`}>
          {sellsOnline && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
        </div>
        <div>
          <p className="text-sm font-medium text-gray-800">🛒 This business accepts online orders</p>
          <p className="text-xs text-gray-500 mt-0.5">Check this if customers can browse and order from your website (even if you also have a physical store)</p>
        </div>
      </div>

      {/* Products / Tags */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Products & Services
          <span className="text-gray-400 font-normal ml-1">(select all that apply)</span>
        </label>
        <div className="flex flex-wrap gap-2 mb-3">
          {PRODUCT_TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                selectedTags.includes(tag)
                  ? 'bg-amber-500 text-white border-amber-500'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-amber-400'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={customTag}
            onChange={(e) => setCustomTag(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomTag() } }}
            placeholder="Add your own product/service..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          />
          <button
            type="button"
            onClick={addCustomTag}
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
          >
            Add
          </button>
        </div>
        {selectedTags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800"
              >
                {tag}
                <button type="button" onClick={() => toggleTag(tag)} className="hover:text-red-600">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
        <input
          name="website_url"
          type="url"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          placeholder="https://yourbusiness.com"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Facebook URL</label>
          <input
            name="facebook_url"
            type="url"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            placeholder="https://facebook.com/yourpage"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Instagram URL</label>
          <input
            name="instagram_url"
            type="url"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            placeholder="https://instagram.com/yourhandle"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contact Email <span className="text-red-500">*</span>
        </label>
        <input
          name="email"
          type="email"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          placeholder="you@example.com"
        />
        <p className="text-xs text-gray-400 mt-1">Not shown publicly. Used only for listing correspondence.</p>
      </div>

      {state === 'error' && (
        <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>
      )}

      <button
        type="submit"
        disabled={state === 'loading'}
        className="w-full py-3 rounded-xl text-white font-semibold text-sm transition-opacity disabled:opacity-60"
        style={{ backgroundColor: '#007A4D' }}
      >
        {state === 'loading' ? 'Submitting...' : 'Submit for Review'}
      </button>
    </form>
  )
}
