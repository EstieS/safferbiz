'use client'

import { useState } from 'react'
import { categoryEmoji, entryBasePoints, type FitEntry, type FitRoutine } from '@/lib/fitness'
import { IntensityBadge, RoutineMoves } from './ui'

interface Props {
  entry: FitEntry
  routine: FitRoutine | undefined
  editable: boolean
  onToggle: () => void
  onDelete: () => void
}

export default function EntryRow({ entry, routine, editable, onToggle, onDelete }: Props) {
  const done = !!entry.completed_at
  // In-progress workouts show their moves straight away - that's what you need mid-workout
  const [open, setOpen] = useState(!done && editable)

  return (
    <div className={`rounded-2xl border p-3 ${done ? 'bg-green-50 border-green-200' : 'bg-white border-pink-200'}`}>
      <div className="flex items-center gap-3">
        {done && (
          <button
            onClick={editable ? onToggle : undefined}
            disabled={!editable}
            aria-label="Mark as not done"
            className="shrink-0 w-12 h-12 rounded-full bg-green-500 text-white text-2xl font-black flex items-center justify-center active:scale-95"
          >
            ✓
          </button>
        )}
        <button className="flex-1 min-w-0 text-left min-h-11" onClick={() => setOpen((o) => !o)}>
          <p className="font-bold text-gray-900 truncate">
            {categoryEmoji(entry.category)} {entry.title}
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mt-0.5">
            <span>{entry.minutes} min</span>
            <IntensityBadge intensity={entry.intensity} />
            <span className={`font-bold ${done ? 'text-green-700' : 'text-gray-400'}`}>
              {done ? '+' : ''}{entryBasePoints(entry)} pts
            </span>
            {!done && <span className="text-pink-600 font-semibold">in progress</span>}
          </div>
        </button>
      </div>

      {open && routine && <RoutineMoves routine={routine} />}
      {open && !routine && <p className="text-xs text-gray-500 mt-2">Custom workout - no move list.</p>}

      {editable && !done && (
        <div className="grid grid-cols-[1fr_auto] gap-2 mt-3">
          <button onClick={onToggle} className="min-h-12 rounded-xl bg-green-500 text-white font-extrabold">
            ✓ Done
          </button>
          <button onClick={onDelete} className="min-h-12 px-4 rounded-xl border-2 border-gray-200 text-gray-500 font-bold text-sm">
            Remove
          </button>
        </div>
      )}
    </div>
  )
}
