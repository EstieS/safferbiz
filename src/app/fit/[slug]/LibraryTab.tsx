'use client'

import { useMemo, useState } from 'react'
import {
  CATEGORIES, INTENSITY, categoryEmoji,
  type Category, type Equipment, type FitRoutine, type Intensity,
} from '@/lib/fitness'
import type { RoutineInput, TabProps } from './FitnessDashboard'
import { Filters, filterRoutines } from './RoutinePicker'
import { Chip, RoutineMoves, RoutineSummary, Sheet } from './ui'

export default function LibraryTab({ data, me, actions }: TabProps) {
  const [category, setCategory] = useState<Category | null>(null)
  const [minutes, setMinutes] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [editing, setEditing] = useState<FitRoutine | 'new' | null>(null)

  const filtered = filterRoutines(data.routines, { category, minutes, equipment: me.equipment, showAll })
  const families = useMemo(() => {
    const map = new Map<string, FitRoutine[]>()
    for (const r of filtered) map.set(r.family, [...(map.get(r.family) ?? []), r])
    for (const list of map.values()) list.sort((a, b) => a.minutes - b.minutes)
    return Array.from(map.entries())
  }, [filtered])

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-200 p-4">
        <Filters
          category={category} setCategory={setCategory}
          minutes={minutes} setMinutes={setMinutes}
          showAll={showAll} setShowAll={setShowAll}
        />
      </div>

      <button
        onClick={() => setEditing('new')}
        className="w-full min-h-14 rounded-2xl border-2 border-dashed border-pink-300 text-pink-600 font-extrabold"
      >
        + Add a routine
      </button>

      {families.length === 0 && <p className="text-center text-sm text-gray-500 py-6">No routines match these filters.</p>}

      <div className="space-y-3">
        {families.map(([family, versions]) => (
          <div key={family} className="bg-white rounded-2xl border border-gray-200 p-4">
            <p className="font-extrabold text-gray-900 mb-2">{categoryEmoji(versions[0].category)} {family}</p>
            <div className="space-y-2">
              {versions.map((r) => (
                <div key={r.id} className="rounded-xl bg-gray-50/60 border border-gray-100 p-3">
                  <div className="flex items-start gap-2">
                    <button className="flex-1 text-left min-h-11" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      <p className="font-bold text-sm text-gray-800">{r.minutes} min version</p>
                      <RoutineSummary routine={r} />
                    </button>
                    <button
                      onClick={() => setEditing(r)}
                      className="shrink-0 min-h-11 px-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-white"
                    >
                      Edit
                    </button>
                  </div>
                  {expanded === r.id && <RoutineMoves routine={r} />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New routine' : 'Edit routine'}>
        {editing && (
          <RoutineForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            defaultEquipment={me.equipment}
            families={Array.from(new Set(data.routines.map((r) => r.family))).sort()}
            onSave={async (input) => {
              const ok = await actions.saveRoutine(input, editing === 'new' ? undefined : editing.id)
              if (ok) setEditing(null)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function movesToText(r: FitRoutine | null): string {
  return (r?.moves ?? []).map((m) => `${m.name} - ${m.amount}`).join('\n')
}

function textToMoves(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.lastIndexOf(' - ')
      return i > 0 ? { name: line.slice(0, i).trim(), amount: line.slice(i + 3).trim() } : { name: line, amount: '' }
    })
}

function RoutineForm({
  initial, defaultEquipment, families, onSave,
}: {
  initial: FitRoutine | null
  defaultEquipment: Equipment
  families: string[]
  onSave: (input: RoutineInput) => Promise<void>
}) {
  const [family, setFamily] = useState(initial?.family ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'full')
  const [minutes, setMinutes] = useState(initial?.minutes ?? 10)
  const [intensity, setIntensity] = useState<Intensity>(initial?.intensity ?? 'medium')
  const [equipment, setEquipment] = useState<Equipment>(initial?.equipment ?? defaultEquipment)
  const [rounds, setRounds] = useState(initial?.rounds ?? 1)
  const [movesText, setMovesText] = useState(movesToText(initial))
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)

  const input = 'w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-pink-500'
  const label = 'block text-xs font-bold text-gray-500 uppercase mb-1.5'

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        const moves = textToMoves(movesText)
        if (!family.trim() || moves.length === 0) return
        setBusy(true)
        await onSave({
          family: family.trim(),
          name: `${family.trim()} (${minutes} min)`,
          category,
          minutes,
          intensity,
          equipment: category === 'cardio' ? 'none' : equipment,
          rounds,
          moves,
          notes: notes.trim() || null,
        })
        setBusy(false)
      }}
      className="space-y-4"
    >
      <div>
        <label className={label}>Routine name</label>
        <input required list="fit-families" value={family} onChange={(e) => setFamily(e.target.value)} placeholder="e.g. Booty Burner" className={input} />
        <datalist id="fit-families">{families.map((f) => <option key={f} value={f} />)}</datalist>
        <p className="text-xs text-gray-400 mt-1">Use the same name for the 5, 10 and 20 minute versions so they group together.</p>
      </div>

      <div>
        <p className={label}>Category</p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <Chip key={c.key} active={category === c.key} onClick={() => setCategory(c.key)} color="#0EA5E9">{c.emoji} {c.label}</Chip>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Minutes</label>
          <input type="number" inputMode="numeric" min={1} max={120} required value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} className={input} />
        </div>
        <div>
          <label className={label}>Rounds</label>
          <input type="number" inputMode="numeric" min={1} max={20} required value={rounds} onChange={(e) => setRounds(Number(e.target.value))} className={input} />
        </div>
      </div>

      <div>
        <p className={label}>Intensity</p>
        <div className="flex gap-2">
          {(Object.keys(INTENSITY) as Intensity[]).map((i) => (
            <Chip key={i} active={intensity === i} onClick={() => setIntensity(i)} color={INTENSITY[i].color}>{INTENSITY[i].label}</Chip>
          ))}
        </div>
      </div>

      {category !== 'cardio' && (
        <div>
          <p className={label}>Equipment</p>
          <div className="flex gap-2">
            <Chip active={equipment === 'dumbbells'} onClick={() => setEquipment('dumbbells')}>🏋️ Dumbbells</Chip>
            <Chip active={equipment === 'none'} onClick={() => setEquipment('none')}>🙌 None</Chip>
          </div>
        </div>
      )}

      <div>
        <label className={label}>Moves (one per line: move - amount)</label>
        <textarea
          required
          rows={6}
          value={movesText}
          onChange={(e) => setMovesText(e.target.value)}
          placeholder={'Squats - 12 reps\nPush-ups - 40s\nPlank - 30 sec'}
          className={`${input} font-mono text-sm`}
        />
      </div>

      <div>
        <label className={label}>Notes (optional)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Rest 30 sec between rounds" className={input} />
      </div>

      <button type="submit" disabled={busy} className="w-full min-h-14 rounded-2xl bg-pink-500 text-white text-lg font-extrabold disabled:opacity-60">
        {busy ? 'Saving...' : 'Save routine'}
      </button>
    </form>
  )
}
