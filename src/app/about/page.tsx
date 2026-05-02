import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'About',
  description: 'The story behind SafferBiz — a directory built by a homesick Saffer for Saffers everywhere.',
}

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden" style={{ backgroundColor: '#007A4D' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 20% 50%, #FFB612 0%, transparent 50%), radial-gradient(circle at 80% 20%, #DE3831 0%, transparent 40%)' }} />
        <div className="relative max-w-3xl mx-auto px-4 py-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/20 text-white text-sm font-medium px-4 py-1.5 rounded-full mb-6">
            🇿🇦 The story behind SafferBiz
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            Built by a Saffer,<br />for Saffers
          </h1>
          <p className="text-white/80 text-lg">
            No corporate team. Just one homesick South African and a serious biltong craving.
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-3xl mx-auto px-4 py-16">

        {/* Photo + intro */}
        <div className="flex flex-col sm:flex-row items-center gap-10 mb-16">
          <div className="flex-shrink-0">
            <div className="w-48 h-48 rounded-full overflow-hidden ring-4 ring-yellow-400 shadow-xl">
              <Image
                src="/Estie_photo.jpg"
                alt="Estie, founder of SafferBiz"
                width={192}
                height={192}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Hey, I&apos;m Estie 👋</h2>
            <p className="text-gray-600 leading-relaxed">
              Not a pro app developer — just a homesick Saffer who really missed her biltong. 🤩
            </p>
          </div>
        </div>

        {/* Story sections */}
        <div className="space-y-10">

          <div className="flex gap-5">
            <div className="flex-shrink-0 w-1 rounded-full self-stretch" style={{ backgroundColor: '#007A4D' }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">How it started</h3>
              <p className="text-gray-600 leading-relaxed">
                SafferBiz started as a little side project during my digital nomad years (2023–2025), when I was forever Googling where to find droëwors and other South African goodies abroad. There was no good answer — so I built one.
              </p>
            </div>
          </div>

          <div className="flex gap-5">
            <div className="flex-shrink-0 w-1 rounded-full self-stretch" style={{ backgroundColor: '#FFB612' }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Where we are now</h3>
              <p className="text-gray-600 leading-relaxed">
                These days I&apos;ve settled in sunny Jacksonville, Florida, but SafferBiz has the same mission it always did — helping Saffers everywhere find a little bit of home, no matter where they are. 💗
              </p>
            </div>
          </div>

          <div className="flex gap-5">
            <div className="flex-shrink-0 w-1 rounded-full self-stretch" style={{ backgroundColor: '#DE3831' }} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Built together</h3>
              <p className="text-gray-600 leading-relaxed">
                If you spot a business I&apos;ve missed — or run one yourself! — please let me know. This community only gets better when we build it together. ✨
              </p>
            </div>
          </div>

        </div>

        {/* CTAs */}
        <div className="mt-16 grid sm:grid-cols-2 gap-4">
          <Link href="/submit"
            className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-dashed hover:border-solid transition-all group"
            style={{ borderColor: '#007A4D' }}>
            <span className="text-3xl mb-2">🏪</span>
            <span className="font-semibold text-gray-900 group-hover:text-green-700">List your business</span>
            <span className="text-sm text-gray-500 mt-1">Get in front of expats worldwide</span>
          </Link>
          <Link href="/subscribe"
            className="flex flex-col items-center text-center p-6 rounded-2xl border-2 border-dashed hover:border-solid transition-all group"
            style={{ borderColor: '#FFB612' }}>
            <span className="text-3xl mb-2">🔔</span>
            <span className="font-semibold text-gray-900 group-hover:text-amber-600">Get alerts</span>
            <span className="text-sm text-gray-500 mt-1">Know when new businesses are added</span>
          </Link>
        </div>

        {/* Contact */}
        <div className="mt-10 text-center text-sm text-gray-400">
          Questions or suggestions?{' '}
          <a href="mailto:safferbiz@gmail.com" className="underline hover:text-gray-600">
            safferbiz@gmail.com
          </a>
        </div>
      </div>
    </div>
  )
}
