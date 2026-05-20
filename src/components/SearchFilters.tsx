'use client'

import { useRouter } from 'next/navigation'

interface Props {
  countries: string[]
  categories: string[]
  selectedCountry: string
  selectedCategory: string
  currentQuery: string
}

export default function SearchFilters({
  countries,
  categories,
  selectedCountry,
  selectedCategory,
  currentQuery,
}: Props) {
  const router = useRouter()

  function update(country: string, category: string) {
    const params = new URLSearchParams()
    if (currentQuery) params.set('q', currentQuery)
    if (country) params.set('country', country)
    if (category) params.set('category', category)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Country filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-500 whitespace-nowrap">Country</label>
        <select
          value={selectedCountry}
          onChange={(e) => update(e.target.value, selectedCategory)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 cursor-pointer"
        >
          <option value="">All countries</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-500 whitespace-nowrap">Category</label>
        <select
          value={selectedCategory}
          onChange={(e) => update(selectedCountry, e.target.value)}
          className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:border-green-600 focus:ring-1 focus:ring-green-600 cursor-pointer"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Active filter chips */}
      {(selectedCountry || selectedCategory) && (
        <div className="flex flex-wrap gap-2">
          {selectedCountry && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              {selectedCountry}
              <button
                onClick={() => update('', selectedCategory)}
                className="ml-0.5 hover:text-green-900 font-bold"
                aria-label={`Remove ${selectedCountry} filter`}
              >
                ×
              </button>
            </span>
          )}
          {selectedCategory && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              {selectedCategory}
              <button
                onClick={() => update(selectedCountry, '')}
                className="ml-0.5 hover:text-blue-900 font-bold"
                aria-label={`Remove ${selectedCategory} filter`}
              >
                ×
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  )
}
