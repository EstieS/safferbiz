'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type State = 'idle' | 'loading' | 'error' | 'done'

export default function ChangePasswordForm({ slug }: { slug: string }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [state, setState] = useState<State>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.')
      setState('error')
      return
    }
    if (password !== confirm) {
      setErrorMsg('Passwords don\'t match.')
      setState('error')
      return
    }

    setState('loading')
    setErrorMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setErrorMsg(error.message)
      setState('error')
    } else {
      setState('done')
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 bg-gradient-to-b from-rose-50 via-white to-amber-50">
      <div className="w-full max-w-sm bg-white rounded-2xl border border-rose-100 p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Change password</h1>
        <p className="text-sm text-gray-500 mb-6">Set a new password for the book club.</p>

        {state === 'done' ? (
          <div>
            <p className="text-sm text-green-700 mb-4">Password updated!</p>
            <button
              onClick={() => router.push(`/clubs/${slug}`)}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm"
              style={{ backgroundColor: '#7B1E3A' }}
            >
              Back to club
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">New password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Confirm password</label>
              <input
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-[#7B1E3A]"
              />
            </div>

            {state === 'error' && <p className="text-sm text-red-600">{errorMsg}</p>}

            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full py-2.5 rounded-lg text-white font-medium text-sm disabled:opacity-60"
              style={{ backgroundColor: '#7B1E3A' }}
            >
              {state === 'loading' ? 'Saving...' : 'Save password'}
            </button>
          </form>
        )}

        <Link href={`/clubs/${slug}`} className="block text-center text-xs text-gray-400 hover:text-[#7B1E3A] mt-4">
          ← Back to club
        </Link>
      </div>
    </div>
  )
}
