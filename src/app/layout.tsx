import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'
import FeedbackWidget from '@/components/FeedbackWidget'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })

export const metadata: Metadata = {
  title: {
    default: 'SafferBiz — South African Businesses Worldwide',
    template: '%s | SafferBiz',
  },
  description:
    'Find South African businesses, shops, and online stores near you. The directory for SA expats looking for biltong, boerewors, gifts, and more from home.',
  keywords: ['South African', 'expat', 'biltong', 'SA shop', 'South Africa', 'directory'],
  openGraph: {
    type: 'website',
    siteName: 'SafferBiz',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased bg-gray-50 text-gray-900">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <FeedbackWidget />
      </body>
    </html>
  )
}
