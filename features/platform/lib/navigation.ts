import { Activity, Users, Target, FileSignature, Handshake, Receipt, Landmark, Building2, ListChecks, BadgeCheck, CreditCard, Settings, type LucideIcon } from 'lucide-react'

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
      { title: 'Tasks', href: '/dashboard/platform/tasks', description: 'Follow-ups and automatic reminders.', icon: ListChecks },
      { title: 'Certifications', href: '/dashboard/platform/certifications', description: 'Agent certifications and expiry.', icon: BadgeCheck },
      { title: 'Settings', href: '/dashboard/platform/settings', description: 'Agency commission defaults.', icon: Settings },
    ],
  },
]

export const platformNavItems = platformNavGroups.flatMap((g) => g.items)
