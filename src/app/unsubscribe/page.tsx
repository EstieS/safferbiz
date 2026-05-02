'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type State = 'loading' | 'success' | 'error' | 'missing'

function UnsubscribeContent() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const [state, setState] = useState<State>(token ? 'loading' : 'missing')

  useEffect(() => {
    if (!token) return
    fetch('/api/unsubscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
      .then((res) => res.json())
      .then((json) => {
        if (json.success) setState('success')
        else setState('error')
      })
      .catch(() => setState('error'))
  }, [token])

  if (state === 'missing') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">🤔</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h2>
        <p className="text-gray-600">This unsubscribe link is missing a token. Please use the link from your email.</p>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4 animate-spin">⏳</div>
        <p className="text-gray-600">Unsubscribing you...</p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="text-5xl mb-4">👋</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re unsubscribed</h2>
        <p className="text-gray-600 mb-6">You won&apos;t receive any more alerts from SafferBiz.</p>
        <p className="text-sm text-gray-400">
          Changed your mind?{' '}
          <a href="/subscribe" className="underline" style={{ color: '#007A4D' }}>
            Subscribe again
          </a>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">😕</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
      <p className="text-gray-600">We couldn&apos;t process your unsubscribe request. The link may have already been used.</p>
    </div>
  )
}

export default function UnsubscribePage() {
  return (
    <Suspense fallback={
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    }>
      <UnsubscribeContent />
    </Suspense>
  )
}
