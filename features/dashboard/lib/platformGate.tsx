import { notFound } from 'next/navigation'
import type { ComponentType } from 'react'
import { getAdminMetaAction } from '@/features/dashboard/actions/getAdminMetaAction'
import { isPlatformPageHidden } from './sidebarAccess'

/** 404s a platform page when its backing lists are hidden for the session (same rule as the sidebar). */
export function gatePlatformPage<P extends object>(slug: string, Page: ComponentType<P>) {
  return async function GatedPlatformPage(props: P) {
    const response = await getAdminMetaAction()
    const lists: { path: string; isHidden?: boolean | null }[] = response.success ? response.data?.lists ?? [] : []
    if (isPlatformPageHidden(slug, lists)) notFound()
    return <Page {...props} />
  }
}
