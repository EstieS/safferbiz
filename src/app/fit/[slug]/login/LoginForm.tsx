'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

type State = 'idle' | 'loading' | 'error'

export default function LoginForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>('idle')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setState('error')
    } else {
      router.push(`/fit/${slug}`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 bg-gradient-to-b from-pink-50 via-white to-sky-50">
      <div className="w-full max-w-sm bg-white rounded-3xl border border-pink-100 p-8 shadow-sm">
        <div className="text-5xl text-center mb-2">🏋️‍♀️</div>
        <h1 className="text-2xl font-extrabold text-center text-gray-900 mb-1">Sweat Sisters</h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Sign in to plan your week and beat your sister.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-pink-500"
            />
          </div>

          {state === 'error' && <p className="text-sm text-red-600">Invalid email or password.</p>}

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-3.5 rounded-xl bg-pink-500 hover:bg-pink-600 text-white font-bold text-base disabled:opacity-60"
          >
            {state === 'loading' ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
