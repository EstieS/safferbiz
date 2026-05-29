import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient, createAdminClient } from '@/lib/supabase-server'

async function requireAdmin() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('site_config')
    .select('key, value')
    .in('key', ['app_banner_active', 'app_banner_expires_at'])

  const config = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))

  // Auto-expire: if past expiry, treat as inactive
  const expiresAt = config['app_banner_expires_at']
  const isActive = config['app_banner_active'] === 'true'
    && (!expiresAt || new Date(expiresAt) > new Date())

  return NextResponse.json({
    active: isActive,
    expires_at: expiresAt ?? null,
  })
}

export async function PATCH(req: NextRequest) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { active, hours = 24 } = await req.json()
  const admin = createAdminClient()

  const expiresAt = active
    ? new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    : ''

  await Promise.all([
    admin.from('site_config')
      .upsert({ key: 'app_banner_active', value: active ? 'true' : 'false', updated_at: new Date().toISOString() }),
    admin.from('site_config')
      .upsert({ key: 'app_banner_expires_at', value: expiresAt, updated_at: new Date().toISOString() }),
  ])

  return NextResponse.json({ success: true, active, expires_at: expiresAt })
}
