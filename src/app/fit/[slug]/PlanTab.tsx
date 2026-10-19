'use client'

import { useMemo, useState } from 'react'
import {
  addDays, entryBasePoints, type Equipment, formatDay, formatWeek, goalFor, weekDays, weekSummary,
} from '@/lib/fitness'
import type { TabProps } from './FitnessDashboard'
import AddWorkoutSheet from './AddWorkoutSheet'
import EntryRow from './EntryRow'
import { firstName, memberColor } from './ui'

export default function PlanTab({ data, me, today, currentWeek, actions }: TabProps) {
  const [week, setWeek] = useState(currentWeek)
  const [viewId, setViewId] = useState(me.id)
  const [sheet, setSheet] = useState<{ day: string; mode: 'browse' | 'surprise' } | null>(null)

  const days = weekDays(week)
  const viewing = data.members.find((m) => m.id === viewId) ?? me
  const isMine = viewing.id === me.id
  const color = memberColor(data.members, viewing.id)
  const routinesById = useMemo(() => new Map(data.routines.map((r) => [r.id, r])), [data.routines])

  const entries = data.entries.filter((e) => e.member_id === viewing.id && days.includes(e.day))
  const plannedPoints = entries.filter((e) => e.planned).reduce((s, e) => s + entryBasePoints(e), 0)
  const goal = goalFor(data.goals, viewing.id, week)
  const isPast = week < currentWeek

  const defaultDay = days.includes(today) ? today : days[0]

  return (
    <div className="space-y-4">
      {/* Week navigator */}
      <div className="flex items-center justify-between bg-white rounded-2xl border border-gray-200 p-1">
        <button onClick={() => setWeek(addDays(week, -7))} className="w-12 h-12 rounded-xl text-2xl text-gray-500 hover:bg-gray-100" aria-label="Previous week">‹</button>
        <div className="text-center">
          <p className="font-extrabold text-gray-900">{formatWeek(week)}</p>
          <p className="text-xs text-gray-500">
            {week === currentWeek ? 'This week' : week === addDays(currentWeek, 7) ? 'Next week' : isPast ? 'Past week' : 'Future week'}
          </p>
        </div>
        <button
          onClick={() => setWeek(addDays(week, 7))}
          disabled={week >= addDays(currentWeek, 28)}
          className="w-12 h-12 rounded-xl text-2xl text-gray-500 hover:bg-gray-100 disabled:opacity-30"
          aria-label="Next week"
        >
          ›
        </button>
      </div>

      {/* Whose plan */}
      {data.members.length > 1 && (
        <div className="flex gap-2">
          {data.members.map((m) => (
            <button
              key={m.id}
              onClick={() => setViewId(m.id)}
              className="flex-1 min-h-11 rounded-xl font-bold text-sm border-2"
              style={
                m.id === viewId
                  ? { backgroundColor: memberColor(data.members, m.id), borderColor: memberColor(data.members, m.id), color: 'white' }
                  : { borderColor: '#E5E7EB', color: '#374151', backgroundColor: 'white' }
              }
            >
              {m.id === me.id ? 'My plan' : `${firstName(m.display_name)}'s plan`}
            </button>
          ))}
        </div>
      )}

      {/* Goal */}
      {isMine ? (
        <GoalCard
          key={`${week}-${goal}`}
          goal={goal}
          plannedPoints={plannedPoints}
          locked={isPast || weekSummary(data.entries, data.goals, me.id, week).completedCount > 0}
          lastWeekPoints={weekSummary(data.entries, data.goals, me.id, addDays(week, -7)).points}
          onSave={(g) => actions.setGoal(week, g)}
        />
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-sm text-gray-600">
            <strong style={{ color }}>{firstName(viewing.display_name)}</strong>&apos;s goal: <strong>{goal} pts</strong>
            {' '}· planned {plannedPoints} pts
          </p>
        </div>
      )}

      {isMine && (
        <div className="bg-white rounded-2xl border border-gray-200 p-4">
          <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">My equipment</p>
          <p className="text-xs text-gray-400 -mt-1 mb-2">Routines are filtered to match. Switch any time.</p>
          <div className="grid grid-cols-2 gap-2">
            {(['dumbbells', 'none'] as Equipment[]).map((eq) => (
              <button
                key={eq}
                onClick={() => eq !== me.equipment && actions.setEquipment(eq)}
                className={`min-h-12 rounded-xl font-bold text-sm border-2 ${
                  me.equipment === eq ? 'bg-pink-500 border-pink-500 text-white' : 'bg-white border-gray-200 text-gray-700'
                }`}
              >
                {eq === 'dumbbells' ? '🏋️ Adjustable dumbbells' : '🙌 No equipment'}
              </button>
            ))}
          </div>
        </div>
      )}

      {isMine && !isPast && (
        <button
          onClick={() => setSheet({ day: defaultDay, mode: 'surprise' })}
          className="w-full min-h-14 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 text-white text-lg font-extrabold shadow"
        >
          🎲 Surprise me
        </button>
      )}

      {/* Days */}
      <div className="space-y-3">
        {days.map((d) => {
          const dayEntries = entries.filter((e) => e.day === d)
          const canAdd = isMine && d >= today
          return (
            <div key={d} className={`rounded-2xl p-3 ${d === today ? 'bg-pink-100/60 ring-2 ring-pink-300' : 'bg-white/70 border border-gray-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-extrabold text-gray-900">
                  {formatDay(d, { weekday: 'long' })}{' '}
                  <span className="font-medium text-gray-400 text-sm">{formatDay(d, { month: 'short', day: 'numeric' })}</span>
                  {d === today && <span className="ml-2 text-xs font-bold text-pink-600">TODAY</span>}
                </p>
                {canAdd && (
                  <button
                    onClick={() => setSheet({ day: d, mode: 'browse' })}
                    className="min-h-11 px-4 rounded-xl bg-white border-2 border-pink-200 text-pink-600 font-bold text-sm"
                  >
                    + Add
                  </button>
                )}
              </div>
              {dayEntries.length === 0 ? (
                <p className="text-sm text-gray-400">{d < today ? '-' : 'Rest day (for now 😉)'}</p>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      routine={e.routine_id ? routinesById.get(e.routine_id) : undefined}
                      editable={isMine}
                      showTick={false}
                      onDelete={() => actions.deleteEntry(e)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <AddWorkoutSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet?.mode === 'surprise' ? 'Surprise me 🎲' : 'Plan a workout'}
        days={days.filter((d) => d >= today)}
        initialDay={sheet?.day ?? defaultDay}
        today={today}
        routines={data.routines}
        equipment={me.equipment}
        startMode={sheet?.mode}
        pickLabel="Plan it"
        onAdd={(day, { routine }) =>
          routine ? actions.addEntry({ routine, day, planned: true, completed: false }) : Promise.resolve(false)
        }
      />
    </div>
  )
}

function GoalCard({
  goal, plannedPoints, locked, lastWeekPoints, onSave,
}: {
  goal: number
  plannedPoints: number
  locked: boolean
  lastWeekPoints: number
  onSave: (goal: number) => Promise<boolean>
}) {
  const [value, setValue] = useState(String(goal))
  const parsed = Number(value)
  const dirty = parsed !== goal && parsed > 0

  const ratio = goal > 0 ? plannedPoints / goal : 0
  const planHint =
    plannedPoints === 0 ? 'Nothing planned yet.'
    : ratio < 0.9 ? `Planned ${plannedPoints} pts - a bit short of your goal.`
    : ratio > 1.5 ? `Planned ${plannedPoints} pts - ambitious! Watch out for overplanning.`
    : `Planned ${plannedPoints} pts - nicely on track.`

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-4">
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
            My points goal {locked && '🔒'}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={10000}
            value={value}
            disabled={locked}
            onChange={(e) => setValue(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-xl font-extrabold focus:outline-none focus:border-pink-500 disabled:bg-gray-50 disabled:text-gray-500"
          />
        </div>
        {!locked && (
          <button
            onClick={() => onSave(Math.round(parsed))}
            disabled={!dirty}
            className="min-h-[52px] px-5 rounded-xl bg-pink-500 text-white font-bold disabled:opacity-40"
          >
            Save
          </button>
        )}
      </div>
      <p className="text-sm text-gray-600 mt-2">{planHint}</p>
      <p className="text-xs text-gray-400 mt-1">
        {locked
          ? 'Goals lock once the week has a workout in it - keeps the head-to-head honest.'
          : `Last week you scored ${lastWeekPoints} pts. Goal locks after your first workout of the week.`}
      </p>
    </div>
  )
}
