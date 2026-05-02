'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'

type State = 'idle' | 'loading' | 'sent' | 'error'

export default function AdminLoginPage() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })

    if (error) {
      setErrorMsg(error.message)
      setState('error')
    } else {
      setState('sent')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Login</h1>
        <p className="text-sm text-gray-500 mb-6">
          Enter your email to receive a magic link.
        </p>

        {state === 'sent' ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-3">📬</div>
            <p className="text-gray-700 font-medium">Check your email</p>
            <p className="text-sm text-gray-500 mt-1">We sent a login link to {email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-green-500"
            />
            {state === 'error' && (
              <p className="text-sm text-red-600">{errorMsg || 'Something went wrong. Please try again.'}</p>
            )}
            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
              style={{ backgroundColor: '#007A4D' }}
            >
              {state === 'loading' ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
