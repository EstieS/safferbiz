'use client'

import { useState } from 'react'
import Link from 'next/link'

type State = 'idle' | 'loading' | 'success' | 'error'

export default function NewsletterBanner() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: email.split('@')[0], email, countries: [], categories: [], wants_events: true }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error)
      setState('success')
    } catch {
      setState('error')
    }
  }

  return (
    <section className="py-14 px-4 border-t border-gray-100" style={{ background: 'linear-gradient(135deg, #f0faf5 0%, #e8f5ff 100%)' }}>
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: '#007A4D' }}>Stay in the loop</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">New SA businesses, delivered to you</h2>
        <p className="text-gray-500 text-sm mb-6">
          Get notified when new SA businesses and events are added near you.
        </p>

        {state === 'success' ? (
          <div className="bg-white rounded-xl border border-green-200 px-6 py-4 inline-block">
            <p className="font-semibold text-gray-800">You&apos;re on the list!</p>
            <p className="text-sm text-gray-500 mt-1">
              Want to filter by country or category?{' '}
              <Link href="/subscribe" style={{ color: '#007A4D' }} className="underline">Customise your alerts →</Link>
            </p>
          </div>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                required
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-green-500 bg-white"
              />
              <button
                type="submit"
                disabled={state === 'loading'}
                className="px-6 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 whitespace-nowrap"
                style={{ backgroundColor: '#007A4D' }}
              >
                {state === 'loading' ? 'Subscribing...' : 'Get Alerts'}
              </button>
            </form>
            {state === 'error' && (
              <p className="text-sm text-red-500 mt-2">Something went wrong — try again or <Link href="/subscribe" className="underline">use the full form</Link>.</p>
            )}
            <p className="text-xs text-gray-400 mt-3">
              Or <Link href="/subscribe" style={{ color: '#007A4D' }} className="underline">pick specific countries & categories →</Link>
            </p>
          </>
        )}
      </div>
    </section>
  )
}
