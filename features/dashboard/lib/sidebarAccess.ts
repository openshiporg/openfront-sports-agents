/**
 * Sidebar filtering from capabilities the session already has: the role's
 * canAccessDashboard flag and Keystone's per-session list `isHidden` from admin meta.
 * Plain module: no 'use server' / 'use client', no @/ imports.
 */

type SidebarList = { path: string; isHidden?: boolean | null }
type SidebarUser = { role?: { canAccessDashboard?: boolean | null } | null } | null | undefined

/** Only an explicit false hides navigation; an unknown user is left to the middleware. */
export function canUseDashboardNav(user: SidebarUser) {
  return user?.role?.canAccessDashboard !== false
}

export function visibleSidebarLists<T extends SidebarList>(lists: T[], user: SidebarUser): T[] {
  if (!canUseDashboardNav(user)) return []
  return lists.filter((list) => !list.isHidden)
}

/**
 * Lists each platform page reads. The page follows their visibility: it is shown when the role
 * can query at least one of them. Pages not listed here stay visible to dashboard users.
 */
export const PLATFORM_PAGE_LISTS: Record<string, string[]> = {
  clients: ['athletes'],
  recruiting: ['athletes'],
  contracts: ['playing-contracts'],
  endorsements: ['endorsement-deals'],
  brands: ['brands'],
  commissions: ['commission-ledger-entries'],
  trust: ['client-trust-accounts'],
  'payment-providers': ['payment-providers'],
  workload: ['athletes', 'tasks'],
  calendar: ['deliverables', 'scheduled-payments'],
  tasks: ['tasks'],
  certifications: ['agent-certifications'],
  approvals: ['manager-approvals'],
  settings: ['agencies'],
  store: ['agencies'],
}

/** True when the platform page's backing lists are all hidden for this session. */
export function isPlatformPageHidden(slug: string, lists: SidebarList[]) {
  const backing = PLATFORM_PAGE_LISTS[slug] ?? [slug]
  const hidden = new Set(lists.filter((list) => list.isHidden).map((list) => list.path))
  const known = new Set(lists.map((list) => list.path))
  const present = backing.filter((path) => known.has(path))
  return present.length > 0 && present.every((path) => hidden.has(path))
}

/**
 * A platform page whose first segment is a list path follows that list's visibility;
 * pages that are not tied to one list stay visible to dashboard users.
 */
export function visiblePlatformItems<T extends { href: string }>(
  items: T[],
  lists: SidebarList[],
  user: SidebarUser
): T[] {
  if (!canUseDashboardNav(user)) return []
  return items.filter((item) => {
    const slug = item.href.split('/platform/')[1]?.split(/[/?#]/)[0]
    return !slug || !isPlatformPageHidden(slug, lists)
  })
}
