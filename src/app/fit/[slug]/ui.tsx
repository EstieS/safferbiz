'use client'

import { useEffect, useState } from 'react'
import {
  INTENSITY, categoryEmoji, categoryLabel, entryBasePoints,
  type FitMember, type FitRoutine, type Intensity,
} from '@/lib/fitness'

export const MEMBER_COLORS = ['#EC4899', '#0EA5E9', '#8B5CF6', '#F59E0B', '#10B981']

export function memberColor(members: FitMember[], memberId: string): string {
  const idx = members.findIndex((m) => m.id === memberId)
  return MEMBER_COLORS[Math.max(idx, 0) % MEMBER_COLORS.length]
}

export function firstName(name: string): string {
  return name.split(' ')[0]
}

export function Chip({
  active, onClick, children, color = '#EC4899',
}: { active: boolean; onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 px-4 min-h-11 rounded-full text-sm font-semibold border-2 transition-colors ${
        active ? 'text-white' : 'bg-white text-gray-700 border-gray-200'
      }`}
      style={active ? { backgroundColor: color, borderColor: color } : undefined}
    >
      {children}
    </button>
  )
}

export function ProgressBar({ pct, color, height = 'h-4' }: { pct: number; color: string; height?: string }) {
  return (
    <div className={`w-full ${height} bg-gray-100 rounded-full overflow-hidden`}>
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{ width: `${Math.min(Math.max(pct, 0), 100)}%`, backgroundColor: color }}
      />
    </div>
  )
}

export function IntensityBadge({ intensity }: { intensity: Intensity }) {
  const i = INTENSITY[intensity]
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-full text-xs font-bold"
      style={{ color: i.color, backgroundColor: `${i.color}1A` }}
    >
      {i.label} ×{i.multiplier}
    </span>
  )
}

export function RoutineSummary({ routine }: { routine: FitRoutine }) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
      <span>{categoryEmoji(routine.category)} {categoryLabel(routine.category)}</span>
      <span>· {routine.minutes} min</span>
      <span>· {routine.equipment === 'dumbbells' ? '🏋️ Dumbbells' : '🙌 No equipment'}</span>
      <IntensityBadge intensity={routine.intensity} />
      <span className="font-bold text-pink-600">+{entryBasePoints(routine)} pts</span>
    </div>
  )
}

export function RoutineMoves({ routine }: { routine: FitRoutine }) {
  return (
    <div className="mt-2 rounded-xl bg-gray-50 p-3">
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
        {routine.rounds > 1 ? `${routine.rounds} rounds of:` : 'Do:'}
      </p>
      <ol className="space-y-1">
        {routine.moves.map((mv, i) => (
          <li key={i} className="flex justify-between gap-3 text-sm">
            <span className="text-gray-800">{i + 1}. {mv.name}</span>
            <span className="text-gray-500 shrink-0 font-medium">{mv.amount}</span>
          </li>
        ))}
      </ol>
      {routine.notes && <p className="text-xs text-gray-500 mt-2 italic">{routine.notes}</p>}
    </div>
  )
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Sheet({
  open, onClose, title, children,
}: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[10000] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[90vh] bg-white rounded-t-3xl sm:rounded-3xl flex flex-col">
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-gray-100">
          <h2 className="text-lg font-extrabold text-gray-900">{title}</h2>
          <button onClick={onClose} className="w-11 h-11 -mr-2 rounded-full text-2xl text-gray-400 hover:bg-gray-100" aria-label="Close">
            ×
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-8">{children}</div>
      </div>
    </div>
  )
}

export function useToggle(initial = false): [boolean, () => void, (v: boolean) => void] {
  const [v, setV] = useState(initial)
  return [v, () => setV((x) => !x), setV]
}
