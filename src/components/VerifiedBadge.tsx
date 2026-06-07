interface Props {
  /** 'sm' for cards, 'md' for the listing detail page */
  size?: 'sm' | 'md'
  /** Show the "Verified" text label alongside the checkmark */
  withLabel?: boolean
}

/**
 * Blue verified checkmark — shown on listings a human has confirmed
 * are genuine, South African-owned businesses (admin-verified or owner-claimed).
 */
export default function VerifiedBadge({ size = 'sm', withLabel = false }: Props) {
  const dim = size === 'md' ? 18 : 15

  const check = (
    <svg
      width={dim}
      height={dim}
      viewBox="0 0 24 24"
      fill="none"
      className="flex-shrink-0"
      aria-label="Verified"
      role="img"
    >
      <path
        d="M12 1.5l2.6 1.9 3.2-.3 1 3.1 2.7 1.8-1 3.1 1 3.1-2.7 1.8-1 3.1-3.2-.3L12 22.5l-2.6-1.9-3.2.3-1-3.1-2.7-1.8 1-3.1-1-3.1 2.7-1.8 1-3.1 3.2.3z"
        fill="#1D9BF0"
      />
      <path
        d="M10.6 14.6l-2.2-2.2-1.2 1.2 3.4 3.4 6-6-1.2-1.2z"
        fill="#fff"
      />
    </svg>
  )

  if (!withLabel) {
    return <span title="Verified — confirmed genuine SA-owned business">{check}</span>
  }

  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: '#1D9BF015', color: '#1D9BF0' }}
      title="Verified — confirmed genuine SA-owned business"
    >
      {check}
      Verified
    </span>
  )
}
