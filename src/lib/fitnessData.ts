import type { SupabaseClient } from '@supabase/supabase-js'
import type { FitEntry, FitGoal, FitHabit, FitHabitLog, FitMember, FitRoutine } from './fitness'

const PAGE = 1000 // Supabase caps responses at 1000 rows, so page through

async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const rows: T[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await query(from, from + PAGE - 1)
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

export interface FitData {
  members: FitMember[]
  routines: FitRoutine[]
  goals: FitGoal[]
  entries: FitEntry[]
  habits: FitHabit[]
  habitLogs: FitHabitLog[]
}

/** Loads everything the tracker needs for one group. Works with the admin or browser client. */
export async function loadFitData(client: SupabaseClient, groupId: string): Promise<FitData> {
  const { data: membersData, error } = await client
    .from('fit_members')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  const members = (membersData ?? []) as FitMember[]
  const memberIds = members.map((m) => m.id)

  const [routines, goals, entries, habits, habitLogs] = await Promise.all([
    fetchAll<FitRoutine>((from, to) =>
      client.from('fit_routines').select('*').eq('group_id', groupId)
        .order('category').order('family').order('minutes').range(from, to)
    ),
    memberIds.length
      ? fetchAll<FitGoal>((from, to) =>
          client.from('fit_goals').select('*').in('member_id', memberIds).order('week_start').range(from, to)
        )
      : Promise.resolve([]),
    memberIds.length
      ? fetchAll<FitEntry>((from, to) =>
          client.from('fit_entries').select('*').in('member_id', memberIds)
            .order('day').order('created_at').range(from, to)
        )
      : Promise.resolve([]),
    fetchAll<FitHabit>((from, to) =>
      client.from('fit_habits').select('*').eq('group_id', groupId).order('sort_order').order('created_at').range(from, to)
    ),
    memberIds.length
      ? fetchAll<FitHabitLog>((from, to) =>
          client.from('fit_habit_logs').select('*').in('member_id', memberIds).order('day').range(from, to)
        )
      : Promise.resolve([]),
  ])

  return { members, routines, goals, entries, habits, habitLogs }
}
