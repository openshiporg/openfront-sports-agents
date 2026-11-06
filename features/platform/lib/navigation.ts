import { Activity, CalendarDays, Users, Target, FileSignature, Handshake, Receipt, Landmark, Building2, ListChecks, BadgeCheck, CreditCard, Settings, ShieldCheck, type LucideIcon, Store } from 'lucide-react'

export interface PlatformNavItem {
  title: string
  href: string
  description: string
  icon: LucideIcon
  permission?: string
}

export interface PlatformNavGroup {
  id: string
  title: string
  items: PlatformNavItem[]
}

export const platformNavGroups: PlatformNavGroup[] = [
  {
    id: 'agency',
    title: 'Agency',
    items: [
      { title: 'Money', href: '/dashboard', description: 'Receivables, expected commission and what is due.', icon: Activity },
      { title: 'Clients', href: '/dashboard/platform/clients', description: 'Athlete roster and client records.', icon: Users },
      { title: 'Recruiting', href: '/dashboard/platform/recruiting', description: 'Prospect pipeline by stage.', icon: Target },
    ],
  },
  {
    id: 'deals',
    title: 'Deals',
    items: [
      { title: 'Contracts', href: '/dashboard/platform/contracts', description: 'Playing contracts, years and incentives.', icon: FileSignature },
      { title: 'Endorsements', href: '/dashboard/platform/endorsements', description: 'Deal pipeline and deliverables calendar.', icon: Handshake },
      { title: 'Brands', href: '/dashboard/platform/brands', description: 'Brands and contacts.', icon: Building2 },
    ],
  },
  {
    id: 'finance',
    title: 'Finance',
    items: [
      { title: 'Commissions', href: '/dashboard/platform/commissions', description: 'Payments, invoices, ledger and agent payouts.', icon: Receipt },
      { title: 'Trust', href: '/dashboard/platform/trust', description: 'Client trust balances and entries.', icon: Landmark },
      { title: 'Payment providers', href: '/dashboard/platform/payment-providers', description: 'Stripe and manual providers.', icon: CreditCard },
    ],
  },
  {
    id: 'operations',
    title: 'Operations',
    items: [
      { title: 'Workload', href: '/dashboard/platform/workload', description: 'Clients, pipeline and tasks per agent.', icon: Users },
      { title: 'Calendar', href: '/dashboard/platform/calendar', description: 'Deliverables and payment dates across athletes.', icon: CalendarDays },
      { title: 'Tasks', href: '/dashboard/platform/tasks', description: 'Follow-ups and automatic reminders.', icon: ListChecks },
      { title: 'Certifications', href: '/dashboard/platform/certifications', description: 'Agent certifications and expiry.', icon: BadgeCheck },
      { title: 'Approvals', href: '/dashboard/platform/approvals', description: 'Overrides and write-offs that need a second person.', icon: ShieldCheck },
      { title: 'Settings', href: '/dashboard/platform/settings', description: 'Agency commission defaults.', icon: Settings },
      { title: 'Store', href: '/dashboard/platform/store', description: 'Configure store settings, logo, and branding.', icon: Store },
    ],
  },
]

export const platformNavItems = platformNavGroups.flatMap((g) => g.items)
