import { useAuth } from '@/lib/auth/AuthProvider'
import { useSiteSettings } from '@/lib/api/hooks/useSiteSettings'
import { LocalizedSettingsSection } from '@/pages/settings/LocalizedSettingsSection'
import { ProfileSection } from '@/pages/settings/ProfileSection'
import { SeedPolicySection } from '@/pages/settings/SeedPolicySection'
import { SiteSettingsSection } from '@/pages/settings/SiteSettingsSection'

/** Profile + site settings (ADMIN-150). Profile facts are read-only from the
 * session (/auth/me); site and localized settings live in their own section
 * components under `pages/settings/`. */
export function SettingsPage() {
  const { user } = useAuth()
  const settings = useSiteSettings()

  return (
    <main className="page">
      <h1>Settings</h1>
      <ProfileSection user={user} />
      <SeedPolicySection seedPolicy={settings.data?.seedPolicy} />
      <SiteSettingsSection settings={settings} />
      <LocalizedSettingsSection />
    </main>
  )
}
