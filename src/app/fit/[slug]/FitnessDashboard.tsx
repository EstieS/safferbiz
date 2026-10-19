'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { loadFitData, type FitData } from '@/lib/fitnessData'
import {
  todayISO, weekStartOf,
  type Equipment, type FitEntry, type FitGoal, type FitGroup, type FitMember, type FitRoutine,
} from '@/lib/fitness'
import type { CustomWorkout } from './RoutinePicker'
import { firstName, memberColor } from './ui'
import PlanTab from './PlanTab'
import WeekTab from './WeekTab'
import ScoreboardTab from './ScoreboardTab'
import LibraryTab from './LibraryTab'

type Tab = 'plan' | 'week' | 'score' | 'library'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'plan', label: 'Plan', emoji: '🗓️' },
  { key: 'week', label: 'This Week', emoji: '✅' },
  { key: 'score', label: 'Scoreboard', emoji: '🏆' },
  { key: 'library', label: 'Library', emoji: '📚' },
]

export type RoutineInput = Omit<FitRoutine, 'id' | 'group_id'>

export interface FitActions {
  addEntry: (input: {
    routine?: FitRoutine
    custom?: CustomWorkout
    day: string
    planned: boolean
    completed: boolean
  }) => Promise<boolean>
  toggleDone: (entry: FitEntry) => Promise<void>
  deleteEntry: (entry: FitEntry) => Promise<void>
  setGoal: (weekStart: string, goal: number) => Promise<boolean>
  setEquipment: (equipment: Equipment) => Promise<void>
  saveRoutine: (routine: RoutineInput, id?: string) => Promise<boolean>
}

interface Props {
  group: FitGroup
  currentMember: FitMember
  initialData: FitData
}

export default function FitnessDashboard({ group, currentMember, initialData }: Props) {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])
  const [data, setData] = useState<FitData>(initialData)
  const [tab, setTab] = useState<Tab>('week')
  const [toast, setToast] = useState<string | null>(null)
  const [today, setToday] = useState(todayISO)

  const me = data.members.find((m) => m.id === currentMember.id) ?? currentMember

  function changeTab(t: Tab) {
    setTab(t)
    window.scrollTo({ top: 0 })
  }

  const flash = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }, [])

  // Keep both phones in sync: refresh when the app comes back into view, and every minute while open.
  const reload = useCallback(async () => {
    try {
      setData(await loadFitData(supabase, group.id))
      setToday(todayISO())
    } catch {
      // offline or session expired - keep showing what we have
    }
  }, [supabase, group.id])

  useEffect(() => {
    const onVisible = () => document.visibilityState === 'visible' && reload()
    document.addEventListener('visibilitychange', onVisible)
    const timer = setInterval(() => document.visibilityState === 'visible' && reload(), 60_000)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(timer)
    }
  }, [reload])

  const actions: FitActions = {
    async addEntry({ routine, custom, day, planned, completed }) {
      const source = routine ?? custom
      if (!source) return false
      const { data: row, error } = await supabase
        .from('fit_entries')
        .insert({
          member_id: me.id,
          routine_id: routine?.id ?? null,
          day,
          title: routine ? routine.family : custom!.title,
          category: source.category,
          minutes: source.minutes,
          intensity: source.intensity,
          planned,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .select()
        .single()
      if (error || !row) {
        flash(`Couldn't save: ${error?.message ?? 'unknown error'}`)
        return false
      }
      setData((d) => ({ ...d, entries: [...d.entries, row as FitEntry] }))
      return true
    },

    async toggleDone(entry) {
      const nowDone = !entry.completed_at
      // Doing a future-planned workout early counts on the day it was actually done
      const patch: Partial<FitEntry> = {
        completed_at: nowDone ? new Date().toISOString() : null,
        ...(nowDone && entry.day > today ? { day: today } : {}),
      }
      setData((d) => ({ ...d, entries: d.entries.map((e) => (e.id === entry.id ? { ...e, ...patch } : e)) }))
      const { error } = await supabase.from('fit_entries').update(patch).eq('id', entry.id)
      if (error) {
        flash(`Couldn't update: ${error.message}`)
        setData((d) => ({ ...d, entries: d.entries.map((e) => (e.id === entry.id ? entry : e)) }))
      }
    },

    async deleteEntry(entry) {
      setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== entry.id) }))
      const { error } = await supabase.from('fit_entries').delete().eq('id', entry.id)
      if (error) {
        flash(`Couldn't remove: ${error.message}`)
        setData((d) => ({ ...d, entries: [...d.entries, entry] }))
      }
    },

    async setGoal(weekStart, goal) {
      const { data: row, error } = await supabase
        .from('fit_goals')
        .upsert({ member_id: me.id, week_start: weekStart, goal }, { onConflict: 'member_id,week_start' })
        .select()
        .single()
      if (error || !row) {
        flash(`Couldn't save goal: ${error?.message ?? 'unknown error'}`)
        return false
      }
      setData((d) => ({
        ...d,
        goals: [...d.goals.filter((g) => !(g.member_id === me.id && g.week_start === weekStart)), row as FitGoal],
      }))
      flash('Goal saved 🎯')
      return true
    },

    async setEquipment(equipment) {
      const { error } = await supabase.from('fit_members').update({ equipment }).eq('id', me.id)
      if (error) return flash(`Couldn't save: ${error.message}`)
      setData((d) => ({ ...d, members: d.members.map((m) => (m.id === me.id ? { ...m, equipment } : m)) }))
    },

    async saveRoutine(routine, id) {
      const query = id
        ? supabase.from('fit_routines').update(routine).eq('id', id)
        : supabase.from('fit_routines').insert({ ...routine, group_id: group.id })
      const { data: row, error } = await query.select().single()
      if (error || !row) {
        flash(`Couldn't save routine: ${error?.message ?? 'unknown error'}`)
        return false
      }
      setData((d) => ({
        ...d,
        routines: id ? d.routines.map((r) => (r.id === id ? (row as FitRoutine) : r)) : [...d.routines, row as FitRoutine],
      }))
      flash(id ? 'Routine updated' : 'Routine added 🎉')
      return true
    },
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push(`/fit/${group.slug}/login`)
    router.refresh()
  }

  const shared = { data, me, today, actions, currentWeek: weekStartOf(today) }

  return (
    <div className="bg-gradient-to-b from-pink-50 via-white to-sky-50 min-h-screen">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">🏋️‍♀️ {group.name}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Hi <strong style={{ color: memberColor(data.members, me.id) }}>{firstName(me.display_name)}</strong>!
              {' '}Let&apos;s get moving.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0 text-xs">
            <Link href={`/fit/${group.slug}/account`} className="text-gray-400 hover:text-pink-600 py-1">Password</Link>
            <button onClick={handleLogout} className="text-gray-400 hover:text-pink-600 py-1">Log out</button>
          </div>
        </div>

        <div className="sticky top-0 z-30 -mx-4 px-4 pt-3 pb-2 mt-3 bg-gradient-to-b from-pink-50 to-pink-50/90 backdrop-blur">
          <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-2xl shadow-sm border border-pink-100">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => changeTab(t.key)}
                className={`min-h-14 rounded-xl flex flex-col items-center justify-center text-xs font-bold transition-colors ${
                  tab === t.key ? 'bg-pink-500 text-white' : 'text-gray-600 hover:bg-pink-50'
                }`}
              >
                <span className="text-lg leading-none mb-0.5">{t.emoji}</span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          {tab === 'plan' && <PlanTab {...shared} />}
          {tab === 'week' && <WeekTab {...shared} />}
          {tab === 'score' && <ScoreboardTab {...shared} />}
          {tab === 'library' && <LibraryTab {...shared} />}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-5 py-3 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-lg max-w-[90vw] text-center">
          {toast}
        </div>
      )}
    </div>
  )
}

export interface TabProps {
  data: FitData
  me: FitMember
  today: string
  currentWeek: string
  actions: FitActions
}
