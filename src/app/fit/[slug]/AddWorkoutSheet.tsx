'use client'

import { useState } from 'react'
import { formatDay, type Equipment, type FitRoutine } from '@/lib/fitness'
import RoutinePicker, { type CustomWorkout } from './RoutinePicker'
import { Sheet } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  days: string[]
  initialDay: string
  today: string
  routines: FitRoutine[]
  equipment: Equipment
  startMode?: 'browse' | 'surprise'
  allowCustom?: boolean
  pickLabel: string
  onAdd: (day: string, pick: { routine?: FitRoutine; custom?: CustomWorkout }) => Promise<boolean>
}

// Mounted fresh each time it opens, so the day picker starts on initialDay
export default function AddWorkoutSheet(props: Props) {
  if (!props.open) return null
  return <AddWorkoutSheetInner {...props} />
}

function AddWorkoutSheetInner({
  open, onClose, title, days, initialDay, today, routines, equipment, startMode, allowCustom, pickLabel, onAdd,
}: Props) {
  const [day, setDay] = useState(initialDay)
  const [busy, setBusy] = useState(false)

  async function add(pick: { routine?: FitRoutine; custom?: CustomWorkout }) {
    if (busy) return
    setBusy(true)
    const ok = await onAdd(day, pick)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Sheet open={open} onClose={onClose} title={title}>
      <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">Day</p>
      <div className="grid grid-cols-7 gap-1 mb-5">
        {days.map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`min-h-14 rounded-xl flex flex-col items-center justify-center text-xs font-bold border-2 ${
              d === day ? 'bg-sky-500 border-sky-500 text-white' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            <span>{formatDay(d)}</span>
            <span className={`text-base ${d === today && d !== day ? 'text-pink-500' : ''}`}>{formatDay(d, { day: 'numeric' })}</span>
          </button>
        ))}
      </div>
      <div className={busy ? 'opacity-60 pointer-events-none' : ''}>
        <RoutinePicker
          routines={routines}
          equipment={equipment}
          startMode={startMode}
          pickLabel={pickLabel}
          onPick={(routine) => add({ routine })}
          onCustom={allowCustom ? (custom) => add({ custom }) : undefined}
        />
      </div>
    </Sheet>
  )
}
