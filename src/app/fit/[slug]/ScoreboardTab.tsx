'use client'

import { useMemo, useState } from 'react'
import {
  addDays, categoryEmoji, categoryLabel, currentStreak, dailyScores, formatWeek,
  weekSummary, weekWinner, weeksWithActivity, type WeekSummary,
} from '@/lib/fitness'
import type { TabProps } from './FitnessDashboard'
import { ProgressBar, firstName, memberColor } from './ui'

export default function ScoreboardTab({ data, me, today, currentWeek }: TabProps) {
  const { members, entries, goals } = data
  const nameOf = (id: string) => firstName(members.find((m) => m.id === id)?.display_name ?? '?')

  const scoresByMember = useMemo(
    () => new Map(members.map((m) => [m.id, dailyScores(entries, m.id)])),
    [members, entries]
  )
  const summarize = (week: string) =>
    members.map((m) => weekSummary(entries, goals, m.id, week, scoresByMember.get(m.id)))

  const weeks = weeksWithActivity(entries, goals, currentWeek)
  const history = weeks.map((w) => ({ week: w, summaries: summarize(w) })).reverse()
  const thisWeek = history[0].summaries
  const pastWeeks = history.slice(1)

  const lastWeek = addDays(currentWeek, -7)
  const [summaryWeek, setSummaryWeek] = useState(weeks.includes(lastWeek) ? lastWeek : currentWeek)

  const leader = weekWinner(thisWeek)
  const teamPoints = thisWeek.reduce((s, x) => s + x.points, 0)
  const teamGoal = thisWeek.reduce((s, x) => s + x.goal, 0)
  const teamPct = teamGoal ? Math.round((teamPoints / teamGoal) * 100) : 0

  const wins = new Map<string, number>()
  for (const { summaries } of pastWeeks) {
    const w = weekWinner(summaries)
    if (w) wins.set(w, (wins.get(w) ?? 0) + 1)
  }

  return (
    <div className="space-y-5">
      {/* Head to head */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-extrabold text-gray-900">⚔️ Head to head</h2>
          <span className="text-xs text-gray-500">{formatWeek(currentWeek)}</span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          {leader
            ? `${leader === me.id ? 'You are' : `${nameOf(leader)} is`} in the lead! 👑`
            : thisWeek.some((s) => s.points > 0) ? "It's neck and neck!" : 'Fresh week - first to move takes the lead.'}
        </p>
        <div className="space-y-4">
          {thisWeek.map((s) => {
            const color = memberColor(members, s.memberId)
            const streak = currentStreak(entries, s.memberId, today)
            return (
              <div key={s.memberId}>
                <div className="flex items-baseline justify-between mb-1">
                  <p className="font-bold" style={{ color }}>
                    {leader === s.memberId && '👑 '}{s.memberId === me.id ? 'You' : nameOf(s.memberId)}
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
      </section>

      {/* Team */}
      <section className="bg-gradient-to-br from-pink-500 to-sky-500 rounded-3xl p-5 text-white">
        <h2 className="text-lg font-extrabold">🤝 Team goal</h2>
        <div className="flex items-end justify-between mt-1 mb-3">
          <p className="text-3xl font-black">{teamPoints}<span className="text-base font-bold opacity-80"> / {teamGoal} pts</span></p>
          <p className="text-3xl font-black">{teamPct}%</p>
        </div>
        <div className="w-full h-5 bg-white/30 rounded-full overflow-hidden">
          <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${Math.min(teamPct, 100)}%` }} />
        </div>
        <p className="text-xs opacity-90 mt-2">
          {teamPct >= 100 ? 'Team goal smashed! 🎉' : `${Math.max(teamGoal - teamPoints, 0)} pts to go together.`}
        </p>
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
              <option key={w} value={w}>{w === currentWeek ? `This week (so far)` : formatWeek(w)}</option>
            ))}
          </select>
        </div>
        <div className="space-y-3">
          {summarize(summaryWeek).map((s) => (
            <SummaryCard key={s.memberId} s={s} name={s.memberId === me.id ? 'You' : nameOf(s.memberId)} color={memberColor(members, s.memberId)} />
          ))}
        </div>
      </section>

      {/* History */}
      <section className="bg-white rounded-3xl border border-gray-200 p-5">
        <h2 className="text-lg font-extrabold text-gray-900 mb-1">📜 History</h2>
        {members.length > 1 && (
          <p className="text-sm text-gray-600 mb-3">
            Weeks won: {members.map((m) => `${m.id === me.id ? 'You' : firstName(m.display_name)} ${wins.get(m.id) ?? 0}`).join(' · ')}
          </p>
        )}
        {pastWeeks.length === 0 ? (
          <p className="text-sm text-gray-400">Finished weeks will show up here.</p>
        ) : (
          <div className="space-y-2">
            {pastWeeks.map(({ week, summaries }) => {
              const winner = weekWinner(summaries)
              const total = summaries.reduce((s, x) => s + x.points, 0)
              return (
                <div key={week} className="rounded-2xl bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-gray-900 text-sm">{formatWeek(week)}</p>
                    <p className="text-xs font-bold text-gray-600">
                      {winner ? `🏆 ${winner === me.id ? 'You' : nameOf(winner)}` : summaries.some((s) => s.points) ? '🤝 Tie' : 'No workouts'}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-600">
                    {summaries.map((s) => (
                      <span key={s.memberId}>
                        <strong style={{ color: memberColor(members, s.memberId) }}>{nameOf(s.memberId)}</strong>{' '}
                        {s.points}/{s.goal} ({s.pct}%)
                      </span>
                    ))}
                    <span className="text-gray-400">Team {total} pts</span>
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

function SummaryCard({ s, name, color }: { s: WeekSummary; name: string; color: string }) {
  const overplanned = s.plannedCount > 0 && s.plannedDone / s.plannedCount < 0.6
  return (
    <div className="rounded-2xl border-2 p-4" style={{ borderColor: `${color}33` }}>
      <div className="flex items-baseline justify-between">
        <p className="font-extrabold" style={{ color }}>{name}</p>
        <p className="text-sm text-gray-600"><strong className="text-gray-900">{s.points}</strong> / {s.goal} pts ({s.pct}%)</p>
      </div>
      <ul className="mt-2 space-y-1 text-sm text-gray-700">
        <li>
          ✅ Planned vs done: <strong>{s.plannedDone} of {s.plannedCount}</strong>
          {s.unplannedDone > 0 && <> + {s.unplannedDone} bonus</>}
          {overplanned && <span className="text-orange-600 font-semibold"> - overplanned? Try fewer, shorter sessions.</span>}
        </li>
        <li>⏱️ {s.minutes} minutes moved{s.streakBonus > 0 && <> · 🔥 +{s.streakBonus} streak bonus</>}</li>
        <li>
          {s.skippedCategories.length === 0 ? (
            <>🌈 Hit every category - well rounded!</>
          ) : (
            <>
              🙈 Skipped:{' '}
              {s.skippedCategories.map((c) => (
                <span key={c} className={`inline-block mr-1 ${s.plannedButSkipped.includes(c) ? 'font-bold text-orange-600' : ''}`}>
                  {categoryEmoji(c)} {categoryLabel(c)}{s.plannedButSkipped.includes(c) ? ' (planned!)' : ''}
                </span>
              ))}
            </>
          )}
        </li>
      </ul>
    </div>
  )
}
