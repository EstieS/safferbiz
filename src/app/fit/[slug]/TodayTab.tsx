'use client'

import { useMemo, useState } from 'react'
import {
  STREAK_BONUS_POINTS, STREAK_MIN_DAYS, addDays, currentStreak, dailyScores, foodPointsOnDay, foodWeekSummary,
  formatDay, weekStartOf, weekSummary,
} from '@/lib/fitness'
import type { TabProps } from './FitnessDashboard'
import AddWorkoutSheet from './AddWorkoutSheet'
import EntryRow from './EntryRow'
import { ProgressBar, firstName, memberColor } from './ui'

export default function TodayTab({ data, me, today, actions }: TabProps) {
  const [day, setDay] = useState(today)
  const [viewId, setViewId] = useState(me.id)
  const [adding, setAdding] = useState(false)

  const viewing = data.members.find((m) => m.id === viewId) ?? me
  const isMine = viewing.id === me.id
  const color = memberColor(data.members, viewing.id)
  const routinesById = useMemo(() => new Map(data.routines.map((r) => [r.id, r])), [data.routines])
  const yesterday = addDays(today, -1)
  const shownDay = day === today || day === yesterday ? day : today

  const scores = dailyScores(data.entries, viewing.id)
  const dayScore = scores.get(shownDay)
  const fitnessToday = (dayScore?.workoutPoints ?? 0) + (dayScore?.streakBonus ?? 0)
  const foodToday = foodPointsOnDay(data.habitLogs, viewing.id, shownDay)
  const week = weekStartOf(shownDay)
  const fitWeek = weekSummary(data.entries, data.goals, viewing.id, week, scores)
  const foodWeek = foodWeekSummary(data.habitLogs, data.habits, viewing.id, week)
  const streak = currentStreak(data.entries, viewing.id, today)

  const entries = data.entries.filter((e) => e.member_id === viewing.id && e.day === shownDay)
  const ticked = new Set(
    data.habitLogs.filter((l) => l.member_id === viewing.id && l.day === shownDay).map((l) => l.habit_id)
  )
  const habits = data.habits.filter((h) => h.active || ticked.has(h.id))
  const foodMax = habits.reduce((s, h) => s + h.points, 0)

  return (
    <div className="space-y-4">
      {/* Day + person */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-white rounded-2xl border border-gray-200">
        {[yesterday, today].map((d) => (
          <button
            key={d}
            onClick={() => setDay(d)}
            className={`min-h-11 rounded-xl font-bold text-sm ${shownDay === d ? 'bg-sky-500 text-white' : 'text-gray-600'}`}
          >
            {d === today ? 'Today' : '‹ Yesterday'}{' '}
            <span className="font-medium opacity-80">{formatDay(d, { weekday: 'short', day: 'numeric' })}</span>
          </button>
        ))}
      </div>

      {data.members.length > 1 && (
        <div className="flex gap-2">
          {data.members.map((m) => {
            const mScores = dailyScores(data.entries, m.id).get(shownDay)
            const fit = (mScores?.workoutPoints ?? 0) + (mScores?.streakBonus ?? 0)
            const food = foodPointsOnDay(data.habitLogs, m.id, shownDay)
            const c = memberColor(data.members, m.id)
            const active = m.id === viewId
            return (
              <button
                key={m.id}
                onClick={() => setViewId(m.id)}
                className="flex-1 min-h-14 rounded-xl border-2 px-2 py-1.5 text-left"
                style={active ? { backgroundColor: c, borderColor: c, color: 'white' } : { borderColor: '#E5E7EB', backgroundColor: 'white' }}
              >
                <p className="font-bold text-sm" style={active ? undefined : { color: c }}>
                  {m.id === me.id ? 'Me' : firstName(m.display_name)}
                </p>
                <p className={`text-xs ${active ? 'text-white/90' : 'text-gray-500'}`}>💪 {fit} · 🥗 {food}</p>
              </button>
            )
          })}
        </div>
      )}

      {/* ---------------- Fitness ---------------- */}
      <section className="bg-white rounded-3xl border border-gray-200 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">💪 Fitness</h2>
          <p className="text-2xl font-black" style={{ color }}>
            {fitnessToday} <span className="text-sm font-bold text-gray-400">pts</span>
          </p>
        </div>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Week: {fitWeek.points} / {fitWeek.goal} pts</span>
            <span className="font-bold text-gray-700">{fitWeek.pct}%</span>
          </div>
          <ProgressBar pct={fitWeek.pct} color={color} height="h-3" />
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-xs text-gray-600">
          <span>{streak > 0 ? `🔥 ${streak}-day streak` : '🔥 No streak yet'}</span>
          {dayScore && dayScore.streakBonus > 0 && <span className="font-bold text-orange-600">+{dayScore.streakBonus} streak bonus today</span>}
        </div>
        {isMine && shownDay === today && streak >= STREAK_MIN_DAYS - 1 && !dayScore && (
          <p className="text-sm font-semibold text-orange-600 mt-2">
            Even 5 minutes today keeps your streak alive and earns +{STREAK_BONUS_POINTS} bonus!
          </p>
        )}

        <div className="space-y-2 mt-3">
          {entries.map((e) => (
            <EntryRow
              key={e.id}
              entry={e}
              routine={e.routine_id ? routinesById.get(e.routine_id) : undefined}
              editable={isMine}
              onToggle={() => actions.toggleDone(e)}
              onDelete={() => actions.deleteEntry(e)}
            />
          ))}
          {entries.length === 0 && !isMine && (
            <p className="text-sm text-gray-400">No workouts {shownDay === today ? 'yet today' : 'yesterday'}.</p>
          )}
        </div>

        {isMine && (
          <button
            onClick={() => setAdding(true)}
            className="w-full min-h-14 mt-3 rounded-2xl bg-gradient-to-r from-pink-500 to-orange-400 text-white text-lg font-extrabold shadow"
          >
            + Add a workout
          </button>
        )}
      </section>

      {/* ---------------- Food ---------------- */}
      <section className="bg-white rounded-3xl border border-gray-200 p-4">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">🥗 Food</h2>
          <p className="text-2xl font-black text-emerald-600">
            {foodToday} <span className="text-sm font-bold text-gray-400">/ {foodMax} pts</span>
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Week: {foodWeek.points} pts{foodWeek.perfectDays > 0 && ` · ⭐ ${foodWeek.perfectDays} perfect day${foodWeek.perfectDays === 1 ? '' : 's'}`}
        </p>

        <div className="space-y-2 mt-3">
          {habits.map((h) => {
            const on = ticked.has(h.id)
            return (
              <button
                key={h.id}
                onClick={isMine ? () => actions.toggleHabit(h, shownDay) : undefined}
                disabled={!isMine}
                className={`w-full min-h-14 flex items-center gap-3 px-3 rounded-2xl border-2 text-left transition-colors ${
                  on ? 'bg-emerald-50 border-emerald-400' : 'bg-white border-gray-200'
                } ${isMine ? 'active:scale-[0.99]' : ''}`}
              >
                <span
                  className={`shrink-0 w-9 h-9 rounded-full border-[3px] flex items-center justify-center text-lg font-black ${
                    on ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-gray-300 text-transparent'
                  }`}
                >
                  ✓
                </span>
                <span className="text-xl">{h.emoji}</span>
                <span className={`flex-1 font-semibold ${on ? 'text-emerald-900' : 'text-gray-800'}`}>{h.name}</span>
                <span className={`text-xs font-bold ${on ? 'text-emerald-700' : 'text-gray-400'}`}>+{h.points}</span>
              </button>
            )
          })}
          {habits.length === 0 && (
            <p className="text-sm text-gray-400">No food habits yet - add some in the Library.</p>
          )}
        </div>
      </section>

      <AddWorkoutSheet
        open={adding}
        onClose={() => setAdding(false)}
        title={shownDay === today ? 'Add a workout' : 'Add a workout (yesterday)'}
        routines={data.routines}
        equipment={me.equipment}
        onEquipmentChange={actions.setEquipment}
        onAdd={(pick) => actions.addEntry({ ...pick, day: shownDay })}
      />
    </div>
  )
}
