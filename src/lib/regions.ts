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

// ─── Country → flag emoji ─────────────────────────────────────────────────

const COUNTRY_FLAG: Record<string, string> = {
  'Australia':            '🇦🇺',
  'Canada':               '🇨🇦',
  'China':                '🇨🇳',
  'Colombia':             '🇨🇴',
  'France':               '🇫🇷',
  'Germany':              '🇩🇪',
  'Greece':               '🇬🇷',
  'Hong Kong':            '🇭🇰',
  'India':                '🇮🇳',
  'Ireland':              '🇮🇪',
  'Israel':               '🇮🇱',
  'Italy':                '🇮🇹',
  'Luxembourg':           '🇱🇺',
  'Mauritius':            '🇲🇺',
  'Mexico':               '🇲🇽',
  'Netherlands':          '🇳🇱',
  'New Zealand':          '🇳🇿',
  'Poland':               '🇵🇱',
  'Portugal':             '🇵🇹',
  'Singapore':            '🇸🇬',
  'South Africa':         '🇿🇦',
  'South Korea':          '🇰🇷',
  'Spain':                '🇪🇸',
  'Thailand':             '🇹🇭',
  'United Arab Emirates': '🇦🇪',
  'United Kingdom':       '🇬🇧',
  'United States':        '🇺🇸',
  'Other':                '🌍',
}

// ─── Helpers ──────────────────────────────────────────────────────────────

export function getRegionColor(country: string): string {
  const region = COUNTRY_REGION[country] ?? 'africa'
  return REGION_COLORS[region]
}

export function getCountryFlag(country: string): string {
  return COUNTRY_FLAG[country] ?? '🌍'
}
