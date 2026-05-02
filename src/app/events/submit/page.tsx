import type { Metadata } from 'next'
import EventSubmitForm from './EventSubmitForm'

export const metadata: Metadata = {
  title: 'Submit an Event | SafferBiz',
  description: 'Add your South African event to the SafferBiz directory.',
}

export default function SubmitEventPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit an Event</h1>
        <p className="text-gray-600">
          Hosting an SA event? Add it here — braais, markets, sports, community meetups, anything!
          Events are reviewed and published within 24–48 hours.
        </p>
      </div>
      <EventSubmitForm />
    </div>
  )
}
