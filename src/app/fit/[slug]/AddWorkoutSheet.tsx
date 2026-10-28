'use client'

import { useState } from 'react'
import type { Equipment, FitRoutine } from '@/lib/fitness'
import RoutinePicker, { type CustomWorkout } from './RoutinePicker'
import { Sheet } from './ui'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  routines: FitRoutine[]
  equipment: Equipment
  onEquipmentChange: (equipment: Equipment) => void
  onAdd: (pick: { routine?: FitRoutine; custom?: CustomWorkout }) => Promise<boolean>
}

// Mounted fresh each time it opens, so filters start clean
export default function AddWorkoutSheet(props: Props) {
  if (!props.open) return null
  return <AddWorkoutSheetInner {...props} />
}

function AddWorkoutSheetInner({ onClose, title, routines, equipment, onEquipmentChange, onAdd }: Props) {
  const [busy, setBusy] = useState(false)

  async function add(pick: { routine?: FitRoutine; custom?: CustomWorkout }) {
    if (busy) return
    setBusy(true)
    const ok = await onAdd(pick)
    setBusy(false)
    if (ok) onClose()
  }

  return (
    <Sheet open onClose={onClose} title={title}>
      <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">My equipment</p>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {(['dumbbells', 'none'] as Equipment[]).map((eq) => (
          <button
            key={eq}
            onClick={() => eq !== equipment && onEquipmentChange(eq)}
            className={`min-h-12 rounded-xl font-bold text-sm border-2 ${
              equipment === eq ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-gray-200 text-gray-700'
            }`}
          >
            {eq === 'dumbbells' ? '🏋️ Dumbbells' : '🙌 No equipment'}
          </button>
        ))}
      </div>
      <div className={busy ? 'opacity-60 pointer-events-none' : ''}>
        <RoutinePicker
          routines={routines}
          equipment={equipment}
          pickLabel="Start"
          onPick={(routine) => add({ routine })}
          onCustom={(custom) => add({ custom })}
        />
      </div>
    </Sheet>
  )
}
