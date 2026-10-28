'use client'

import { useMemo, useState } from 'react'
import {
  CATEGORIES, INTENSITY, TIME_OPTIONS, categoryEmoji, routineMatchesEquipment,
  type Category, type Equipment, type FitRoutine, type Intensity,
} from '@/lib/fitness'
import { Chip, RoutineMoves, RoutineSummary } from './ui'

export interface CustomWorkout {
  title: string
  category: Category
  minutes: number
  intensity: Intensity
}

interface Props {
  routines: FitRoutine[]
  equipment: Equipment
  onPick: (routine: FitRoutine) => void
  onCustom?: (workout: CustomWorkout) => void
  startMode?: Mode
  pickLabel?: string
}

type Mode = 'browse' | 'surprise' | 'custom'

export function filterRoutines(
  routines: FitRoutine[],
  { category, minutes, equipment, showAll }: { category: Category | null; minutes: number | null; equipment: Equipment; showAll: boolean }
): FitRoutine[] {
  return routines.filter(
    (r) =>
      (!category || r.category === category) &&
      (!minutes || r.minutes === minutes) &&
      (showAll || routineMatchesEquipment(r, equipment))
  )
}

export function Filters({
  category, setCategory, minutes, setMinutes, showAll, setShowAll, requireTime = false,
}: {
  category: Category | null
  setCategory: (c: Category | null) => void
  minutes: number | null
  setMinutes: (m: number | null) => void
  showAll: boolean
  setShowAll: (v: boolean) => void
  requireTime?: boolean
}) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">Time</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {!requireTime && <Chip active={minutes === null} onClick={() => setMinutes(null)}>Any</Chip>}
          {TIME_OPTIONS.map((t) => (
            <Chip key={t} active={minutes === t} onClick={() => setMinutes(t)}>{t} min</Chip>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">Category{requireTime ? ' (optional)' : ''}</p>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Chip active={category === null} onClick={() => setCategory(null)} color="#0EA5E9">
            {requireTime ? 'Anything' : 'All'}
          </Chip>
          {CATEGORIES.map((c) => (
            <Chip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)} color="#0EA5E9">
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-3 min-h-11 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={showAll}
          onChange={(e) => setShowAll(e.target.checked)}
          className="w-5 h-5 accent-pink-500"
        />
        Show all equipment options
      </label>
    </div>
  )
}

export default function RoutinePicker({ routines, equipment, onPick, onCustom, startMode = 'browse', pickLabel = 'Add' }: Props) {
  const [mode, setMode] = useState<Mode>(startMode)
  const [category, setCategory] = useState<Category | null>(null)
  const [minutes, setMinutes] = useState<number | null>(startMode === 'surprise' ? 10 : null)
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [suggestion, setSuggestion] = useState<FitRoutine | null>(null)

  const filtered = useMemo(
    () => filterRoutines(routines, { category, minutes, equipment, showAll }),
    [routines, category, minutes, equipment, showAll]
  )

  function surprise() {
    const all = filterRoutines(routines, { category, minutes: minutes ?? 10, equipment, showAll })
    const fresh = all.filter((r) => r.id !== suggestion?.id) // don't "shuffle" to the same one
    const from = fresh.length ? fresh : all
    setSuggestion(from.length ? from[Math.floor(Math.random() * from.length)] : null)
  }

  function switchMode(m: Mode) {
    setMode(m)
    setSuggestion(null)
    if (m === 'surprise' && minutes === null) setMinutes(10)
  }

  return (
    <div>
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl mb-4">
        {(['browse', 'surprise', ...(onCustom ? ['custom'] : [])] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 min-h-11 rounded-xl text-sm font-bold ${mode === m ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
          >
            {m === 'browse' ? '📋 Browse' : m === 'surprise' ? '🎲 Surprise me' : '✏️ Other'}
          </button>
        ))}
      </div>

      {mode === 'custom' && onCustom && <CustomForm onSubmit={onCustom} />}

      {mode !== 'custom' && (
        <Filters
          category={category}
          setCategory={(c) => { setCategory(c); setSuggestion(null) }}
          minutes={minutes}
          setMinutes={(t) => { setMinutes(t); setSuggestion(null) }}
          showAll={showAll}
          setShowAll={(v) => { setShowAll(v); setSuggestion(null) }}
          requireTime={mode === 'surprise'}
        />
      )}

      {mode === 'surprise' && (
        <div className="mt-4">
          {!suggestion ? (
            <button
              onClick={surprise}
              className="w-full min-h-14 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 text-white text-lg font-extrabold shadow"
            >
              🎲 Pick one for me!
            </button>
          ) : (
            <div className="rounded-2xl border-2 border-pink-200 p-4">
              <p className="text-xs font-bold text-pink-500 uppercase">How about...</p>
              <p className="text-lg font-extrabold text-gray-900">{categoryEmoji(suggestion.category)} {suggestion.name}</p>
              <RoutineSummary routine={suggestion} />
              <RoutineMoves routine={suggestion} />
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button onClick={surprise} className="min-h-12 rounded-xl border-2 border-gray-200 font-bold text-gray-700">
                  🔄 Shuffle
                </button>
                <button onClick={() => onPick(suggestion)} className="min-h-12 rounded-xl bg-pink-500 text-white font-bold">
                  {pickLabel}
                </button>
              </div>
            </div>
          )}
          {suggestion === null && filterRoutines(routines, { category, minutes: minutes ?? 10, equipment, showAll }).length === 0 && (
            <p className="text-sm text-gray-500 mt-3 text-center">No routines match that combo yet - try another category or add one in the Library.</p>
          )}
        </div>
      )}

      {mode === 'browse' && (
        <div className="mt-4 space-y-2">
          {filtered.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-6">No routines match these filters.</p>
          )}
          {filtered.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-200 p-3">
              <div className="flex items-start gap-3">
                <button className="flex-1 text-left min-h-11" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                  <p className="font-bold text-gray-900">{categoryEmoji(r.category)} {r.name}</p>
                  <RoutineSummary routine={r} />
                </button>
                <button
                  onClick={() => onPick(r)}
                  className="shrink-0 min-h-11 px-4 rounded-xl bg-pink-500 text-white font-bold text-sm"
                >
                  {pickLabel}
                </button>
              </div>
              {expanded === r.id && <RoutineMoves routine={r} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CustomForm({ onSubmit }: { onSubmit: (w: CustomWorkout) => void }) {
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('cardio')
  const [minutes, setMinutes] = useState(20)
  const [intensity, setIntensity] = useState<Intensity>('medium')

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        if (!title.trim() || minutes <= 0) return
        onSubmit({ title: title.trim(), category, minutes, intensity })
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">What did you do?</label>
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Pilates class, hike, tennis"
          className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-pink-500"
        />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)} color="#0EA5E9">
              {c.emoji} {c.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Minutes</label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={300}
          required
          value={minutes}
          onChange={(e) => setMinutes(Number(e.target.value))}
          className="w-32 px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-pink-500"
        />
      </div>
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">Intensity</p>
        <div className="flex gap-2">
          {(Object.keys(INTENSITY) as Intensity[]).map((i) => (
            <Chip key={i} active={intensity === i} onClick={() => setIntensity(i)} color={INTENSITY[i].color}>
              {INTENSITY[i].label}
            </Chip>
          ))}
        </div>
      </div>
      <button type="submit" className="w-full min-h-14 rounded-2xl bg-pink-500 text-white text-lg font-extrabold">
        Add it
      </button>
    </form>
  )
}
