import { PlatformPage, Section, Empty, ErrorState } from '../../components/Section'
import { platformQuery } from '../../lib/query'
import { BrandForm, ContactForm, DoNotContact } from '../components/DirectoryForms'

/** Organisation and linked brands as one list, so a contact whose organisation is its brand shows that name once. */
const orgs = (c: any): string[] => { const seen = new Set<string>(); return [c.org, ...c.brand_contacts.map((b: any) => b.name)].filter((n) => { const k = String(n ?? '').trim().toLowerCase(); if (!k || seen.has(k)) return false; seen.add(k); return true }) }

export default async function BrandsPage() {
  let data: any, canLift = false
  try {
    data = await platformQuery(`{ brands(orderBy: { name: asc }, take: 300) { id name category website contacts { id name } } contacts(orderBy: { name: asc }, take: 500) { id name org role email phone doNotContact doNotContactReason brand_contacts { id name } }
      authenticatedItem { ... on User { role { canViewAllClients } } } }`)
    canLift = Boolean(data.authenticatedItem?.role?.canViewAllClients)
  } catch (e: any) { return <PlatformPage title="Brands"><ErrorState message={e.message} /></PlatformPage> }
  const brands = data.brands.map((b: any) => ({ id: b.id, name: b.name, category: b.category, website: b.website }))
  return (
    <PlatformPage title="Brands">
      <Section title="Brands" hint={String(data.brands.length)}>
        <div className="border-b p-3"><BrandForm /></div>
        {data.brands.length ? data.brands.map((b: any) => (
          <div key={b.id} className="flex flex-col gap-2 border-b px-3 py-2.5 text-sm last:border-b-0">
            <div className="min-w-0"><div className="font-medium">{b.name}</div><div className="break-words text-xs text-muted-foreground">{[b.category, b.website, b.contacts.length ? `${b.contacts.length} ${b.contacts.length === 1 ? 'contact' : 'contacts'}` : ''].filter(Boolean).join(' · ') || 'No details yet'}</div></div>
            <div><BrandForm brand={b} /></div>
          </div>
        )) : <Empty>No brands</Empty>}
      </Section>
      <Section title="Contacts" hint={String(data.contacts.length)}>
        <div className="border-b p-3"><ContactForm brands={brands} /></div>
        {data.contacts.length ? data.contacts.map((c: any) => (
          <div key={c.id} className="flex flex-col gap-2 border-b px-3 py-2.5 text-sm last:border-b-0">
            <div className="min-w-0">
              <div className="truncate"><span className="font-medium">{c.name}</span>{c.doNotContact && <span className="ml-2 font-mono text-xs uppercase text-destructive">Do not contact</span>}</div>
              <div className="text-xs text-muted-foreground">{[c.role, ...orgs(c)].filter(Boolean).join(' · ')}</div>
              {(c.email || c.phone) && <div className="break-all text-xs">{[c.email, c.phone].filter(Boolean).join(' · ')}</div>}
              {c.doNotContact && c.doNotContactReason && <div className="text-xs text-muted-foreground">Reason: {c.doNotContactReason}</div>}
            </div>
            <div className="flex flex-wrap gap-2"><ContactForm brands={brands} contact={{ id: c.id, name: c.name, org: c.org, role: c.role, email: c.email, phone: c.phone, brandIds: c.brand_contacts.map((b: any) => b.id) }} /><DoNotContact contactId={c.id} name={c.name} flagged={c.doNotContact} canLift={canLift} /></div>
          </div>
        )) : <Empty>No contacts</Empty>}
      </Section>
    </PlatformPage>
  )
}
