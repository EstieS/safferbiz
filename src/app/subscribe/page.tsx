'use client'

import { useState } from 'react'
import { CATEGORIES, COUNTRIES } from '@/lib/constants'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function SubscribePage() {
  const [state, setState] = useState<State>('idle')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [countries, setCountries] = useState<string[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [wantsEvents, setWantsEvents] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  function toggle<T>(arr: T[], item: T, set: (v: T[]) => void) {
    set(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, countries, categories, wants_events: wantsEvents }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🎉</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re subscribed!</h2>
        <p className="text-gray-600">We&apos;ll email you when new SA businesses or events matching your preferences are listed.</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Stay in the Loop</h1>
        <p className="text-gray-600">Get notified when new South African businesses and events are added that match your interests.</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-8 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Your Name <span className="text-red-500">*</span></label>
            <input required value={name} onChange={e => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
              placeholder="e.g. Estie" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
            <input required type="email" value={email} onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
              placeholder="you@example.com" />
          </div>
        </div>

        {/* Countries */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Countries <span className="text-gray-400 font-normal">(leave blank for all)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.filter(c => c !== 'Other').map(c => (
              <button key={c} type="button" onClick={() => toggle(countries, c, setCountries)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  countries.includes(c) ? 'bg-blue-900 text-white border-blue-900' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-400'
                }`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categories <span className="text-gray-400 font-normal">(leave blank for all)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => toggle(categories, c, setCategories)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-all ${
                  categories.includes(c) ? 'text-white border-green-700' : 'bg-white text-gray-600 border-gray-200 hover:border-green-500'
                }`}
                style={categories.includes(c) ? { backgroundColor: '#007A4D' } : {}}>
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Events */}
        <div onClick={() => setWantsEvents(!wantsEvents)}
          className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            wantsEvents ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-red-300'
          }`}>
          <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-all ${
            wantsEvents ? 'bg-red-500 border-red-500' : 'border-gray-300'
          }`}>
            {wantsEvents && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">🎉 Also notify me about new events</p>
            <p className="text-xs text-gray-500 mt-0.5">Braais, markets, community meetups and more</p>
          </div>
        </div>

        {state === 'error' && <p className="text-sm text-red-600 bg-red-50 px-4 py-2 rounded-lg">{errorMsg}</p>}

        <button type="submit" disabled={state === 'loading'}
          className="w-full py-3 rounded-xl text-white font-semibold text-sm disabled:opacity-60"
          style={{ backgroundColor: '#007A4D' }}>
          {state === 'loading' ? 'Subscribing...' : 'Subscribe'}
        </button>
      </form>
    </div>
  )
}
