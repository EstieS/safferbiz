'use client'

import { useState } from 'react'
import type { FitHabit } from '@/lib/fitness'
import type { HabitInput, TabProps } from './FitnessDashboard'
import { Sheet } from './ui'

export default function FoodLibrary({ data, actions }: TabProps) {
  const [editing, setEditing] = useState<FitHabit | 'new' | null>(null)
  const active = data.habits.filter((h) => h.active)
  const retired = data.habits.filter((h) => !h.active)
  const dailyMax = active.reduce((s, h) => s + h.points, 0)

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600 px-1">
        One shared list for both of you. A perfect day is worth <strong>{dailyMax} pts</strong>.
        Changes apply from now on - past ticks keep their points.
      </p>

      <button
        onClick={() => setEditing('new')}
        className="w-full min-h-14 rounded-2xl border-2 border-dashed border-emerald-300 text-emerald-700 font-extrabold"
      >
        + Add a food habit
      </button>

      <div className="space-y-2">
        {active.map((h) => (
          <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} />
        ))}
      </div>

      {retired.length > 0 && (
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase mb-1.5 px-1">Switched off</p>
          <div className="space-y-2 opacity-60">
            {retired.map((h) => (
              <HabitRow key={h.id} habit={h} onEdit={() => setEditing(h)} />
            ))}
          </div>
        </div>
      )}

      <Sheet open={!!editing} onClose={() => setEditing(null)} title={editing === 'new' ? 'New food habit' : 'Edit food habit'}>
        {editing && (
          <HabitForm
            key={editing === 'new' ? 'new' : editing.id}
            initial={editing === 'new' ? null : editing}
            nextSort={Math.max(0, ...data.habits.map((h) => h.sort_order)) + 1}
            onSave={async (input) => {
              const ok = await actions.saveHabit(input, editing === 'new' ? undefined : editing.id)
              if (ok) setEditing(null)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

function HabitRow({ habit, onEdit }: { habit: FitHabit; onEdit: () => void }) {
  return (
    <div className="flex items-center gap-3 min-h-14 px-3 bg-white rounded-2xl border border-gray-200">
      <span className="text-xl">{habit.emoji}</span>
      <span className="flex-1 font-semibold text-gray-800">{habit.name}</span>
      <span className="text-xs font-bold text-emerald-700">+{habit.points}</span>
      <button onClick={onEdit} className="min-h-11 px-3 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50">
        Edit
      </button>
    </div>
  )
}

function HabitForm({
  initial, nextSort, onSave,
}: { initial: FitHabit | null; nextSort: number; onSave: (input: HabitInput) => Promise<void> }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [emoji, setEmoji] = useState(initial?.emoji ?? '✅')
  const [points, setPoints] = useState(initial?.points ?? 3)
  const [active, setActive] = useState(initial?.active ?? true)
  const [busy, setBusy] = useState(false)

  const input = 'w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:border-emerald-500'
  const label = 'block text-xs font-bold text-gray-500 uppercase mb-1.5'

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault()
        if (!name.trim() || points <= 0) return
        setBusy(true)
        await onSave({
          name: name.trim(),
          emoji: emoji.trim() || '✅',
          points,
          active,
          sort_order: initial?.sort_order ?? nextSort,
        })
        setBusy(false)
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-[5rem_1fr] gap-3">
        <div>
          <label className={label}>Emoji</label>
          <input value={emoji} onChange={(e) => setEmoji(e.target.value)} maxLength={8} className={`${input} text-center text-xl`} />
        </div>
        <div>
          <label className={label}>Habit</label>
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Took my vitamins" className={input} />
        </div>
      </div>
      <div>
        <label className={label}>Points</label>
        <input
          type="number" inputMode="numeric" min={1} max={50} required
          value={points} onChange={(e) => setPoints(Number(e.target.value))}
          className={`${input} w-32`}
        />
      </div>
      {initial && (
        <label className="flex items-center gap-3 min-h-11 text-sm text-gray-700">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-emerald-500" />
          On the daily list (untick to switch it off)
        </label>
      )}
      <button type="submit" disabled={busy} className="w-full min-h-14 rounded-2xl bg-emerald-500 text-white text-lg font-extrabold disabled:opacity-60">
        {busy ? 'Saving...' : 'Save habit'}
      </button>
    </form>
  )
}
