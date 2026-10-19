'use client'

import { useState } from 'react'
import { categoryEmoji, entryBasePoints, type FitEntry, type FitRoutine } from '@/lib/fitness'
import { IntensityBadge, RoutineMoves } from './ui'

interface Props {
  entry: FitEntry
  routine: FitRoutine | undefined
  editable: boolean
  showTick: boolean
  onToggle?: () => void
  onDelete?: () => void
}

export default function EntryRow({ entry, routine, editable, showTick, onToggle, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const done = !!entry.completed_at

  return (
    <div className={`rounded-2xl border p-3 ${done ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'}`}>
      <div className="flex items-center gap-3">
        {showTick && (
          <button
            onClick={editable ? onToggle : undefined}
            disabled={!editable}
            aria-label={done ? 'Mark as not done' : 'Mark as done'}
            className={`shrink-0 w-12 h-12 rounded-full border-[3px] flex items-center justify-center text-2xl font-black transition-colors ${
              done ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 text-transparent'
            } ${editable ? 'active:scale-95' : 'opacity-80'}`}
          >
            ✓
          </button>
        )}
        <button className="flex-1 min-w-0 text-left min-h-11" onClick={() => setOpen((o) => !o)}>
          <p className={`font-bold text-gray-900 truncate ${done ? 'line-through decoration-green-600/40' : ''}`}>
            {categoryEmoji(entry.category)} {entry.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-0.5">
            <span>{entry.minutes} min</span>
            <IntensityBadge intensity={entry.intensity} />
            <span className={`font-bold ${done ? 'text-green-700' : 'text-gray-400'}`}>
              {done ? '+' : ''}{entryBasePoints(entry)} pts
            </span>
            {!entry.planned && <span className="text-sky-600 font-semibold">bonus round</span>}
          </div>
        </button>
        {editable && onDelete && !done && (
          confirming ? (
            <button onClick={onDelete} className="shrink-0 min-h-11 px-3 rounded-xl bg-red-500 text-white text-xs font-bold">
              Remove
            </button>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="shrink-0 w-11 h-11 rounded-full text-xl text-gray-300 hover:text-red-500 hover:bg-red-50"
              aria-label="Remove"
            >
              ×
            </button>
          )
        )}
      </div>
      {open && routine && <RoutineMoves routine={routine} />}
      {open && !routine && <p className="text-xs text-gray-500 mt-2">Custom workout - no move list.</p>}
    </div>
  )
}
