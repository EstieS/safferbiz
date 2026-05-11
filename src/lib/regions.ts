import { SA_COLORS } from './constants'

// ─── Region → SA flag colour ───────────────────────────────────────────────

const REGION_COLORS = {
  europe:      SA_COLORS.red,    // #DE3831
  americas:    SA_COLORS.blue,   // #002395
  australasia: SA_COLORS.gold,   // #FFB612
  africa:      SA_COLORS.green,  // #007A4D
} as const

// ─── Country → region ─────────────────────────────────────────────────────

const COUNTRY_REGION: Record<string, keyof typeof REGION_COLORS> = {
  // Europe
  'United Kingdom': 'europe',
  'Ireland':        'europe',
  'France':         'europe',
  'Germany':        'europe',
  'Netherlands':    'europe',
  'Greece':         'europe',
  'Italy':          'europe',
  'Luxembourg':     'europe',
  'Poland':         'europe',
  'Portugal':       'europe',
  'Spain':          'europe',

  // Americas
  'United States':  'americas',
  'Canada':         'americas',
  'Mexico':         'americas',
  'Colombia':       'americas',

  // Australasia & Asia-Pacific
  'Australia':      'australasia',
  'New Zealand':    'australasia',
  'Singapore':      'australasia',
  'Hong Kong':      'australasia',
  'China':          'australasia',
  'South Korea':    'australasia',
  'Thailand':       'australasia',
  'India':          'australasia',

  // Africa & Middle East (default green)
  'South Africa':         'africa',
  'Mauritius':            'africa',
  'United Arab Emirates': 'africa',
  'Israel':               'africa',
}

// ─── Country → ISO 3166-1 alpha-2 code ────────────────────────────────────
// Used to render flag images via flagcdn.com (works on Windows too)

const COUNTRY_CODE: Record<string, string> = {
  'Australia':            'au',
  'Canada':               'ca',
  'China':                'cn',
  'Colombia':             'co',
  'France':               'fr',
  'Germany':              'de',
  'Greece':               'gr',
  'Hong Kong':            'hk',
  'India':                'in',
  'Ireland':              'ie',
  'Israel':               'il',
  'Italy':                'it',
  'Luxembourg':           'lu',
  'Mauritius':            'mu',
  'Mexico':               'mx',
  'Netherlands':          'nl',
  'New Zealand':          'nz',
  'Poland':               'pl',
  'Portugal':             'pt',
  'Singapore':            'sg',
  'South Africa':         'za',
  'South Korea':          'kr',
  'Spain':                'es',
  'Thailand':             'th',
  'United Arab Emirates': 'ae',
  'United Kingdom':       'gb',
  'United States':        'us',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getRegionColor(country: string): string {
  const region = COUNTRY_REGION[country] ?? 'africa'
  return REGION_COLORS[region]
}

export function getCountryFlag(country: string): string {
  const code = COUNTRY_CODE[country]
  if (!code) return ''   // "Other" — caller should show 🌍 text fallback
  return `https://flagcdn.com/20x15/${code}.png`
}
