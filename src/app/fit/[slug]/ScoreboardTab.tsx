'use client'

import { useMemo, useState } from 'react'
import {
  addDays, categoryEmoji, categoryLabel, currentStreak, dailyScores, foodWeekSummary, foodWinner, formatWeek,
  goalFor, weekSummary, weekWinner, weeksWithActivity,
  type FitHabit, type FoodWeekSummary, type WeekSummary,
} from '@/lib/fitness'
import type { TabProps } from './FitnessDashboard'
import { ProgressBar, firstName, memberColor } from './ui'

export default function ScoreboardTab({ data, me, today, currentWeek, actions }: TabProps) {
  const { members, entries, goals, habits, habitLogs } = data
  const nameOf = (id: string) => (id === me.id ? 'You' : firstName(members.find((m) => m.id === id)?.display_name ?? '?'))

  const scoresByMember = useMemo(
    () => new Map(members.map((m) => [m.id, dailyScores(entries, m.id)])),
    [members, entries]
  )
  const summarize = (week: string) => ({
    fit: members.map((m) => weekSummary(entries, goals, m.id, week, scoresByMember.get(m.id))),
    food: members.map((m) => foodWeekSummary(habitLogs, habits, m.id, week)),
  })

  const weeks = weeksWithActivity(entries, goals, currentWeek, habitLogs)
  const history = weeks.map((w) => ({ week: w, ...summarize(w) })).reverse()
  const thisWeek = history[0]
  const pastWeeks = history.slice(1)

  const lastWeek = addDays(currentWeek, -7)
  const [summaryWeek, setSummaryWeek] = useState(weeks.includes(lastWeek) ? lastWeek : currentWeek)
  const [goalWeek, setGoalWeek] = useState(currentWeek)
  const nextWeek = addDays(currentWeek, 7)

  const fitLeader = weekWinner(thisWeek.fit)
  const foodLeader = foodWinner(thisWeek.food)
  const teamPoints = thisWeek.fit.reduce((s, x) => s + x.points, 0)
  const teamGoal = thisWeek.fit.reduce((s, x) => s + x.goal, 0)
  const teamPct = teamGoal ? Math.round((teamPoints / teamGoal) * 100) : 0
  const foodWeekMax = 7 * habits.filter((h) => h.active).reduce((s, h) => s + h.points, 0)

  const fitWins = new Map<string, number>()
  const foodWins = new Map<string, number>()
  for (const w of pastWeeks) {
    const f = weekWinner(w.fit)
    if (f) fitWins.set(f, (fitWins.get(f) ?? 0) + 1)
    const g = foodWinner(w.food)
    if (g) foodWins.set(g, (foodWins.get(g) ?? 0) + 1)
  }

  const myThisWeek = thisWeek.fit.find((s) => s.memberId === me.id)

  return (
    <div className="space-y-5">
      {/* ---------------- Fitness ---------------- */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-extrabold text-gray-900">💪 Fitness head to head</h2>
          <span className="text-xs text-gray-500 shrink-0">{formatWeek(currentWeek)}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {fitLeader
            ? `${fitLeader === me.id ? 'You are' : `${nameOf(fitLeader)} is`} in the lead! 👑`
            : thisWeek.fit.some((s) => s.points > 0) ? "It's neck and neck!" : 'Fresh week - first to move takes the lead.'}
        </p>
        <div className="space-y-4">
          {thisWeek.fit.map((s) => {
            const color = memberColor(members, s.memberId)
            const streak = currentStreak(entries, s.memberId, today)
            return (
              <div key={s.memberId}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="font-bold" style={{ color }}>
                    {fitLeader === s.memberId && '👑 '}{nameOf(s.memberId)}
                    {streak > 0 && <span className="text-xs text-orange-600 ml-2">🔥{streak}</span>}
                  </p>
                  <p className="text-sm text-gray-500">
                    <span className="text-2xl font-black text-gray-900">{s.pct}%</span> · {s.points}/{s.goal}
                  </p>
                </div>
                <ProgressBar pct={s.pct} color={color} height="h-5" />
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-3">Ranked by % of your own goal, so different goals stay fair.</p>

        <div className="mt-4 rounded-2xl bg-gradient-to-br from-pink-500 to-sky-500 p-4 text-white">
          <div className="flex items-end justify-between">
            <p className="font-extrabold">🤝 Team goal</p>
            <p className="text-xl font-black">{teamPct}%</p>
          </div>
          <div className="w-full h-4 bg-white/30 rounded-full overflow-hidden mt-2">
            <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.min(teamPct, 100)}%` }} />
          </div>
          <p className="text-xs opacity-90 mt-2">
            {teamPoints} / {teamGoal} pts · {teamPct >= 100 ? 'Team goal smashed! 🎉' : `${Math.max(teamGoal - teamPoints, 0)} to go together`}
          </p>
        </div>
      </section>

      {/* Goal */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-extrabold text-gray-900">🎯 My fitness goal</h2>
          <div className="flex gap-1 p-1 bg-gray-100 rounded-xl text-xs font-bold">
            {[currentWeek, nextWeek].map((w) => (
              <button
                key={w}
                onClick={() => setGoalWeek(w)}
                className={`min-h-9 px-3 rounded-lg ${goalWeek === w ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}
              >
                {w === currentWeek ? 'This week' : 'Next week'}
              </button>
            ))}
          </div>
        </div>
        <GoalForm
          key={`${goalWeek}-${goalFor(goals, me.id, goalWeek)}`}
          goal={goalFor(goals, me.id, goalWeek)}
          locked={goalWeek === currentWeek && (myThisWeek?.completedCount ?? 0) > 0}
          lastWeekPoints={weekSummary(entries, goals, me.id, addDays(goalWeek, -7), scoresByMember.get(me.id)).points}
          onSave={(g) => actions.setGoal(goalWeek, g)}
        />
      </section>

      {/* ---------------- Food ---------------- */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <h2 className="text-lg font-extrabold text-gray-900 mb-1">🥗 Food head to head</h2>
        <p className="text-sm text-gray-600 mb-4">
          {foodLeader
            ? `${foodLeader === me.id ? 'You are' : `${nameOf(foodLeader)} is`} eating the best this week! 🥇`
            : thisWeek.food.some((s) => s.points > 0) ? 'Tied on food!' : 'No ticks yet this week.'}
        </p>
        <div className="space-y-4">
          {thisWeek.food.map((s) => (
            <div key={s.memberId}>
              <div className="flex items-baseline justify-between mb-1">
                <p className="font-bold" style={{ color: memberColor(members, s.memberId) }}>
                  {foodLeader === s.memberId && '🥇 '}{nameOf(s.memberId)}
                </p>
                <p className="text-sm text-gray-500">
                  <span className="text-2xl font-black text-gray-900">{s.points}</span> pts
                  {s.perfectDays > 0 && ` · ⭐${s.perfectDays}`}
                </p>
              </div>
              <ProgressBar pct={foodWeekMax ? (s.points / foodWeekMax) * 100 : 0} color="#10B981" height="h-5" />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-3">Same list for both of you, so it&apos;s straight points. Bar = share of a perfect week.</p>
      </section>

      {/* Week summary */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <h2 className="text-lg font-extrabold text-gray-900 whitespace-nowrap">📝 Summary</h2>
          <select
            value={summaryWeek}
            onChange={(e) => setSummaryWeek(e.target.value)}
            className="min-h-11 min-w-0 px-3 rounded-xl border border-gray-300 text-sm bg-white"
          >
            {[...weeks].reverse().map((w) => (
              <option key={w} value={w}>{w === currentWeek ? 'This week (so far)' : formatWeek(w)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {(() => {
            const s = summarize(summaryWeek)
            return s.fit.map((fit, i) => (
              <SummaryCard
                key={fit.memberId}
                fit={fit}
                food={s.food[i]}
                habits={habits}
                name={nameOf(fit.memberId)}
                color={memberColor(members, fit.memberId)}
              />
            ))
          })()}
        </div>
      </section>

      {/* History */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <h2 className="text-lg font-extrabold text-gray-900 mb-1">📜 History</h2>
        {members.length > 1 && (
          <div className="text-sm text-gray-600 mb-3 space-y-0.5">
            <p>💪 Fitness weeks won: {members.map((m) => `${nameOf(m.id)} ${fitWins.get(m.id) ?? 0}`).join(' · ')}</p>
            <p>🥗 Food weeks won: {members.map((m) => `${nameOf(m.id)} ${foodWins.get(m.id) ?? 0}`).join(' · ')}</p>
          </div>
        )}
        {pastWeeks.length === 0 ? (
          <p className="text-sm text-gray-400">Finished weeks will show up here.</p>
        ) : (
          <div className="space-y-2">
            {pastWeeks.map(({ week, fit, food }) => {
              const fw = weekWinner(fit)
              const gw = foodWinner(food)
              return (
                <div key={week} className="rounded-2xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-gray-900 text-sm">{formatWeek(week)}</p>
                    <p className="text-xs font-bold text-gray-600 text-right">
                      💪 {fw ? nameOf(fw) : fit.some((s) => s.points) ? 'Tie' : '-'} · 🥗 {gw ? nameOf(gw) : food.some((s) => s.points) ? 'Tie' : '-'}
                    </p>
                  </div>
                  <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                    {fit.map((s, i) => (
                      <p key={s.memberId}>
                        <strong style={{ color: memberColor(members, s.memberId) }}>{nameOf(s.memberId)}</strong>{' '}
                        💪 {s.points}/{s.goal} ({s.pct}%) · 🥗 {food[i].points}
                      </p>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

function GoalForm({
  goal, locked, lastWeekPoints, onSave,
}: {
  goal: number
  locked: boolean
  lastWeekPoints: number
  onSave: (goal: number) => Promise<boolean>
}) {
  const [value, setValue] = useState(String(goal))
  const parsed = Number(value)
  const dirty = parsed !== goal && parsed > 0

  return (
    <div>
      <div className="flex items-end gap-3">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={10000}
          value={value}
          disabled={locked}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Weekly fitness points goal"
          className="flex-1 min-w-0 px-4 py-3 border border-gray-300 rounded-xl text-xl font-extrabold focus:outline-none focus:border-pink-500 disabled:bg-gray-50 disabled:text-gray-500"
        />
        {locked ? (
          <span className="min-h-[52px] px-4 flex items-center text-2xl">🔒</span>
        ) : (
          <button
            onClick={() => onSave(Math.round(parsed))}
            disabled={!dirty}
            className="min-h-[52px] px-5 rounded-xl bg-pink-500 text-white font-bold disabled:opacity-40"
          >
            Save
          </button>
        )}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {locked
          ? 'Locked - this week already has a workout in it, which keeps the head-to-head honest.'
          : `Scored ${lastWeekPoints} pts the week before. A week's goal locks after its first workout.`}
      </p>
    </div>
  )
}

function SummaryCard({
  fit, food, habits, name, color,
}: { fit: WeekSummary; food: FoodWeekSummary; habits: FitHabit[]; name: string; color: string }) {
  const habitName = (id: string) => {
    const h = habits.find((x) => x.id === id)
    return h ? `${h.emoji} ${h.name}` : '?'
  }
  return (
    <div className="rounded-2xl border-2 p-4" style={{ borderColor: `${color}33` }}>
      <p className="font-extrabold" style={{ color }}>{name}</p>
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
        <li>💪 <strong>{fit.points}</strong> / {fit.goal} pts ({fit.pct}%) · {fit.completedCount} workout{fit.completedCount === 1 ? '' : 's'}, {fit.minutes} min</li>
        {fit.streakBonus > 0 && <li>🔥 +{fit.streakBonus} streak bonus</li>}
        <li>
          {fit.skippedCategories.length === 0 ? (
            <>🌈 Hit every workout category!</>
          ) : (
            <>🙈 Skipped: {fit.skippedCategories.map((c) => `${categoryEmoji(c)} ${categoryLabel(c)}`).join(', ')}</>
          )}
        </li>
        <li>🥗 <strong>{food.points}</strong> food pts · {food.ticks} tick{food.ticks === 1 ? '' : 's'}{food.perfectDays > 0 && ` · ⭐ ${food.perfectDays} perfect day${food.perfectDays === 1 ? '' : 's'}`}</li>
        {food.topHabitIds.length > 0 && <li>👍 Most consistent: {food.topHabitIds.map(habitName).join(', ')}</li>}
        {food.missedHabitIds.length > 0 && food.ticks > 0 && <li>🤔 Never ticked: {food.missedHabitIds.map(habitName).join(', ')}</li>}
      </ul>
    </div>
  )
}
