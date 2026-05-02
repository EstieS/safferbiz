'use client'

import { useState, useRef, useEffect } from 'react'

type State = 'idle' | 'open' | 'loading' | 'success' | 'error'

export default function FeedbackWidget() {
  const [state, setState] = useState<State>('idle')
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (state === 'open' && ref.current && !ref.current.contains(e.target as Node)) {
        setState('idle')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [state])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setState('loading')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, email }),
      })
      if (!res.ok) throw new Error()
      setState('success')
      setMessage('')
      setEmail('')
    } catch {
      setState('error')
    }
  }

  return (
    <div ref={ref} className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">

      {/* Modal */}
      {(state === 'open' || state === 'loading' || state === 'error') && (
        <div className="w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"
            style={{ background: '#007A4D' }}>
            <div>
              <p className="text-white font-semibold text-sm">Share feedback</p>
              <p className="text-white/70 text-xs mt-0.5">Ideas, bugs, or just saying hi 👋</p>
            </div>
            <button onClick={() => setState('idle')} className="text-white/70 hover:text-white transition-colors">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form onSubmit={submit} className="p-4 space-y-3">
            <textarea
              required
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="What's on your mind?"
              rows={4}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:border-green-500"
            />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Your email (optional)"
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-green-500"
            />
            {state === 'error' && (
              <p className="text-xs text-red-600">Something went wrong — please try again.</p>
            )}
            <button
              type="submit"
              disabled={state === 'loading'}
              className="w-full py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-60 transition-opacity"
              style={{ backgroundColor: '#007A4D' }}
            >
              {state === 'loading' ? 'Sending…' : 'Send Feedback'}
            </button>
          </form>
        </div>
      )}

      {/* Success toast */}
      {state === 'success' && (
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 px-5 py-4 text-center w-72">
          <div className="text-3xl mb-2">🙏</div>
          <p className="font-semibold text-gray-900 text-sm">Thanks for the feedback!</p>
          <p className="text-xs text-gray-500 mt-1">We really appreciate it.</p>
          <button onClick={() => setState('idle')} className="mt-3 text-xs underline text-gray-400">Close</button>
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={() => setState(state === 'open' ? 'idle' : 'open')}
        className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold shadow-lg hover:shadow-xl transition-all active:scale-95"
        style={{ backgroundColor: '#007A4D' }}
        aria-label="Share feedback"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4z" />
        </svg>
        Feedback
      </button>
    </div>
  )
}
