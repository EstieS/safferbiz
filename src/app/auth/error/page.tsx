import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-20 text-center">
      <div className="text-5xl mb-4">🔗</div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Link expired or already used</h2>
      <p className="text-gray-600 mb-6">
        Magic links can only be used once and expire after an hour. Please request a new one.
      </p>
      <Link
        href="/admin"
        className="inline-block px-6 py-3 rounded-xl text-white font-semibold text-sm"
        style={{ backgroundColor: '#007A4D' }}
      >
        Request a new link →
      </Link>
    </div>
  )
}
