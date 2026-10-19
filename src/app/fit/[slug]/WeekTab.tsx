'use client'

import { useMemo, useState } from 'react'
import {
  STREAK_BONUS_POINTS, currentStreak, dailyScores, formatDay, formatWeek, weekDays, weekSummary,
} from '@/lib/fitness'
import type { TabProps } from './FitnessDashboard'
import AddWorkoutSheet from './AddWorkoutSheet'
import EntryRow from './EntryRow'
import { ProgressBar, firstName, memberColor } from './ui'

export default function WeekTab({ data, me, today, currentWeek, actions }: TabProps) {
  const [viewId, setViewId] = useState(me.id)
  const [logging, setLogging] = useState(false)

  const days = weekDays(currentWeek)
  const viewing = data.members.find((m) => m.id === viewId) ?? me
  const isMine = viewing.id === me.id
  const color = memberColor(data.members, viewing.id)
  const routinesById = useMemo(() => new Map(data.routines.map((r) => [r.id, r])), [data.routines])

  const scores = dailyScores(data.entries, viewing.id)
  const summary = weekSummary(data.entries, data.goals, viewing.id, currentWeek, scores)
  const streak = currentStreak(data.entries, viewing.id, today)
  const entries = data.entries.filter((e) => e.member_id === viewing.id && days.includes(e.day))

  // Today first, then the rest of the week in order
  const orderedDays = [...days.filter((d) => d === today), ...days.filter((d) => d !== today)]

  return (
    <div className="space-y-4">
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
              {m.id === me.id ? 'Me' : firstName(m.display_name)}
            </button>
          ))}
        </div>
      )}

      {/* Progress card */}
      <div className="bg-white rounded-3xl border border-gray-200 p-5">
        <p className="text-xs font-bold text-gray-500 uppercase">{formatWeek(currentWeek)}</p>
        <div className="flex items-end justify-between mt-1 mb-3">
          <p className="text-4xl font-black" style={{ color }}>
            {summary.points}
            <span className="text-lg font-bold text-gray-400"> / {summary.goal} pts</span>
          </p>
          <p className="text-3xl font-black text-gray-900">{summary.pct}%</p>
        </div>
        <ProgressBar pct={summary.pct} color={color} height="h-5" />
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3 text-sm text-gray-600">
          <span>{streak > 0 ? `🔥 ${streak}-day streak` : '🔥 No streak yet'}</span>
          <span>✅ {summary.plannedDone}/{summary.plannedCount} planned done</span>
          {summary.streakBonus > 0 && <span>⭐ +{summary.streakBonus} streak bonus</span>}
        </div>
        {isMine && streak >= 2 && !scores.has(today) && (
          <p className="text-sm font-semibold text-orange-600 mt-2">
            Even 5 minutes today keeps your streak alive{streak + 1 >= 3 ? ` and earns +${STREAK_BONUS_POINTS} bonus` : ''}!
          </p>
        )}
      </div>

      {isMine && (
        <button
          onClick={() => setLogging(true)}
          className="w-full min-h-14 rounded-2xl bg-sky-500 text-white text-lg font-extrabold shadow"
        >
          + Log a workout I just did
        </button>
      )}

      <div className="space-y-3">
        {orderedDays.map((d) => {
          const dayEntries = entries.filter((e) => e.day === d)
          const dayScore = scores.get(d)
          if (d !== today && dayEntries.length === 0) return null
          return (
            <div key={d} className={`rounded-2xl p-3 ${d === today ? 'bg-pink-100/60 ring-2 ring-pink-300' : 'bg-white/70 border border-gray-100'}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="font-extrabold text-gray-900">
                  {d === today ? 'Today' : formatDay(d, { weekday: 'long' })}{' '}
                  <span className="font-medium text-gray-400 text-sm">{formatDay(d, { month: 'short', day: 'numeric' })}</span>
                </p>
                {dayScore && dayScore.streakBonus > 0 && (
                  <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2 py-1 rounded-full">
                    🔥 +{dayScore.streakBonus} streak
                  </span>
                )}
              </div>
              {dayEntries.length === 0 ? (
                <p className="text-sm text-gray-400">
                  {isMine ? 'Nothing planned today - log a quick one above!' : 'Nothing planned today.'}
                </p>
              ) : (
                <div className="space-y-2">
                  {dayEntries.map((e) => (
                    <EntryRow
                      key={e.id}
                      entry={e}
                      routine={e.routine_id ? routinesById.get(e.routine_id) : undefined}
                      editable={isMine}
                      showTick
                      onToggle={() => actions.toggleDone(e)}
                      onDelete={() => actions.deleteEntry(e)}
                    />
                  ))}
                </div>
              )}
            </div>
          )
        })}
        {entries.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">
            {isMine ? 'No workouts planned this week yet - head to the Plan tab.' : `${firstName(viewing.display_name)} hasn't planned anything yet.`}
          </p>
        )}
      </div>

      <AddWorkoutSheet
        open={logging}
        onClose={() => setLogging(false)}
        title="Log a workout"
        days={days.filter((d) => d <= today)}
        initialDay={today}
        today={today}
        routines={data.routines}
        equipment={me.equipment}
        allowCustom
        pickLabel="Done it!"
        onAdd={(day, pick) => actions.addEntry({ ...pick, day, planned: false, completed: true })}
      />
    </div>
  )
}
