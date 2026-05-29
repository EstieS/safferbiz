import { createAdminClient } from '@/lib/supabase-server'
import AppBanner from './AppBanner'

export default async function AppBannerServer() {
  try {
    const admin = createAdminClient()
    const { data } = await admin
      .from('site_config')
      .select('key, value')
      .in('key', ['app_banner_active', 'app_banner_expires_at'])

    const config = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value]))
    const expiresAt = config['app_banner_expires_at'] ?? ''
    const isActive = config['app_banner_active'] === 'true'
      && (!expiresAt || new Date(expiresAt) > new Date())

    if (!isActive) return null

    return <AppBanner expiresAt={expiresAt} />
  } catch {
    // If table doesn't exist yet, silently skip the banner
    return null
  }
}
