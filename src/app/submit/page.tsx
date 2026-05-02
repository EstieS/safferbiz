import type { Metadata } from 'next'
import SubmitForm from './SubmitForm'

export const metadata: Metadata = {
  title: 'List Your South African Business',
  description:
    'Add your South African business to SafferBiz. Reach SA expats worldwide looking for familiar products and services from home.',
}

export default function SubmitPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">List Your Business</h1>
      <p className="text-gray-500 mb-8">
        It&apos;s free. Your listing will be reviewed and published within 24–48 hours.
      </p>
      <SubmitForm />
    </div>
  )
}
