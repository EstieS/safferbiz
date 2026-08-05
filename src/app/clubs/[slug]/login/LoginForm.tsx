'use client'

import { useState } from 'react'
import { Dancing_Script } from 'next/font/google'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

const script = Dancing_Script({ subsets: ['latin'], weight: '700' })
const WINE = '#7B1E3A'

type State = 'idle' | 'loading' | 'error'

export default function LoginForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setErrorMsg('Invalid email or password.')
      setState('error')
    } else {
      sessionStorage.setItem('showWelcomeQuote', '1')
      router.push(`/clubs/${slug}`)
      router.refresh()
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-gradient-to-b from-rose-50 via-white to-amber-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-rose-100 p-8 shadow-sm">
        <h1 className={`${script.className} text-4xl mb-2 text-center`} style={{ color: WINE }}>
          🍷 Bubbles and Books 📚
        </h1>
        <p className="text-sm text-gray-500 mb-6 text-center">Sign in to see this month&apos;s pick and add your score.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
            />
          </div>

          {state === 'error' && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={state === 'loading'}
            className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
            style={{ backgroundColor: WINE }}
          >
            {state === 'loading' ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}
