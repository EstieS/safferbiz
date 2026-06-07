'use client'

import { useState } from 'react'

type FormState = 'idle' | 'loading' | 'success' | 'error'

export default function ClaimForm({ slug, businessName }: { slug: string; businessName: string }) {
  const [state, setState] = useState<FormState>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    const form = e.currentTarget
    const data = Object.fromEntries(new FormData(form).entries())

    try {
      const res = await fetch('/api/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, slug }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Something went wrong')
      setState('success')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
    }
  }

  if (state === 'success') {
    return (
      <div className="mt-6 text-center py-10 bg-white rounded-2xl border border-gray-200 p-8">
        <div className="text-5xl mb-4">🙋</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Claim Submitted!</h2>
        <p className="text-gray-600 text-sm">
          Thanks — we'll review your claim for <strong>{businessName}</strong> and email you once it's
          approved. You'll then get a private link to manage your listing.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Name <span className="text-red-500">*</span>
        </label>
        <input
          name="claimant_name"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          placeholder="Jane Smith"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your Email <span className="text-red-500">*</span>
        </label>
        <input
          name="claimant_email"
          type="email"
          required
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
          placeholder="you@yourbusiness.com"
        />
        <p className="text-xs text-gray-400 mt-1">Ideally an email at the business's domain — it helps us verify faster.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Your connection to the business
        </label>
        <textarea
          name="message"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500 resize-none"
          placeholder="e.g. I'm the owner / manager. Here's our website or social page so you can confirm..."
        />
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
        {state === 'loading' ? 'Submitting...' : 'Submit Claim'}
      </button>
    </form>
  )
}
