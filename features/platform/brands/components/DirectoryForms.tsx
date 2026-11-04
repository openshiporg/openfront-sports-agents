'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useCommand } from '../../components/useCommand'

const sel = 'mt-1 block w-full rounded-md border bg-background px-3 py-2 text-base'
type Brand = { id: string; name: string; category?: string; website?: string }
type Contact = { id: string; name: string; org?: string; role?: string; email?: string; phone?: string; brandIds?: string[] }

export function BrandForm({ brand }: { brand?: Brand }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: brand?.name ?? '', category: brand?.category ?? '', website: brand?.website ?? '' })
  const { run, pending, error } = useCommand('saveBrand', () => { setOpen(false); if (!brand) setF({ name: '', category: '', website: '' }) })
  if (!open) return <Button size="sm" variant={brand ? 'outline' : 'default'} onClick={() => setOpen(true)}>{brand ? 'Edit' : 'Add brand'}</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); run({ brandId: brand?.id, ...f }) }}>
    <label className="text-sm">Name<Input required maxLength={120} value={f.name} onChange={set('name')} /></label>
    <label className="text-sm">Category<Input maxLength={80} value={f.category} onChange={set('category')} placeholder="Apparel, nutrition" /></label>
    <label className="text-sm">Website<Input maxLength={200} value={f.website} onChange={set('website')} placeholder="brand.com" /></label>
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || f.name.trim().length < 2}>{pending ? 'Working' : brand ? 'Save brand' : 'Add brand'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}

export function ContactForm({ contact, brands }: { contact?: Contact; brands: Brand[] }) {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ name: contact?.name ?? '', org: contact?.org ?? '', role: contact?.role ?? '', email: contact?.email ?? '', phone: contact?.phone ?? '', brandId: '' })
  const { run, pending, error } = useCommand('saveContact', () => { setOpen(false); if (!contact) setF({ name: '', org: '', role: '', email: '', phone: '', brandId: '' }) })
  if (!open) return <Button size="sm" variant={contact ? 'outline' : 'default'} onClick={() => setOpen(true)}>{contact ? 'Edit' : 'Add contact'}</Button>
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  const linkable = brands.filter((b) => !contact?.brandIds?.includes(b.id))
  return <form className="flex w-full flex-col gap-3 rounded-md border p-3" onSubmit={(e) => { e.preventDefault(); run({ contactId: contact?.id, ...f, brandId: f.brandId || undefined }) }}>
    <label className="text-sm">Name<Input required maxLength={120} value={f.name} onChange={set('name')} /></label>
    <label className="text-sm">Organisation<Input maxLength={120} value={f.org} onChange={set('org')} /></label>
    <label className="text-sm">Role<Input maxLength={120} value={f.role} onChange={set('role')} /></label>
    <label className="text-sm">Email<Input type="email" maxLength={200} value={f.email} onChange={set('email')} /></label>
    <label className="text-sm">Phone<Input maxLength={30} value={f.phone} onChange={set('phone')} /></label>
    {linkable.length > 0 && <label className="text-sm">{contact ? 'Link to another brand' : 'Brand'}<select className={sel} value={f.brandId} onChange={set('brandId')}><option value="">None</option>{linkable.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>}
    <div className="flex gap-2"><Button type="submit" size="sm" disabled={pending || f.name.trim().length < 2}>{pending ? 'Working' : 'Save contact'}</Button><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button></div>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </form>
}

/** Marking is open to any agent; lifting is manager-only and the server enforces it. A reason is always recorded. */
export function DoNotContact({ contactId, name, flagged, canLift }: { contactId: string; name: string; flagged: boolean; canLift: boolean }) {
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [local, setLocal] = useState('')
  const { run, pending, error } = useCommand('setContactDoNotContact', () => { setOpen(false); setReason('') })
  if (flagged && !canLift) return null
  if (!open) return <Button size="sm" variant="outline" onClick={() => setOpen(true)}>{flagged ? 'Lift do not contact' : 'Do not contact'}</Button>
  return <div className="flex w-full flex-col gap-2 rounded-md border p-3 text-sm">
    <div>{flagged ? `Allow outbound contact with ${name} again?` : `Block calls, meetings, emails, texts and visits with ${name}? Notes stay allowed.`}</div>
    <label className="flex flex-col gap-1">Reason<Input maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
    {(local || error) && <div role="alert" className="text-destructive">{local || error}</div>}
    <div className="flex gap-2"><Button size="sm" disabled={pending} onClick={() => { setLocal(''); if (reason.trim().length < 5) { setLocal('Enter a reason of at least 5 characters'); return } run({ contactId, doNotContact: !flagged, reason }) }}>{pending ? 'Working' : 'Confirm'}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Cancel</Button></div>
  </div>
}
