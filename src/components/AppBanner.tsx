'use client'

import { useState, useEffect } from 'react'

const APP_STORE_URL = 'https://apps.apple.com/us/app/safferbiz/id6746512857'

interface Props {
  /** ISO string — used as a cache-buster for localStorage so each activation is fresh */
  expiresAt: string
}

export default function AppBanner({ expiresAt }: Props) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Use the expiry timestamp as a unique key — dismissing one activation
    // won't suppress the next one
    const key = `safferbiz_banner_dismissed_${expiresAt}`
    if (!localStorage.getItem(key)) {
      setVisible(true)
    }
  }, [expiresAt])

  function dismiss() {
    const key = `safferbiz_banner_dismissed_${expiresAt}`
    localStorage.setItem(key, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="w-full flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium"
      style={{ backgroundColor: '#FFB612', color: '#1a1a1a' }}
    >
      <span className="text-base">📱</span>
      <span>
        The <strong>SafferBiz app</strong> is now available on the App Store — find SA businesses on the go!
      </span>
      <a
        href={APP_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold bg-white hover:bg-gray-100 transition-colors"
        style={{ color: '#007A4D' }}
      >
        Download ↗
      </a>
      <button
        onClick={dismiss}
        aria-label="Dismiss banner"
        className="flex-shrink-0 ml-1 hover:opacity-60 transition-opacity text-lg leading-none"
        style={{ color: '#1a1a1a' }}
      >
        ×
      </button>
    </div>
  )
}
