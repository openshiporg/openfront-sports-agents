import { Input } from '@/components/ui/input'
import { MAX_TERMS_DAYS } from '@/features/keystone/lib/paymentTerms'
/** GraphQL Int variables reject strings: blank is null, otherwise a number. */
export const daysArg = (v: string) => (v.trim() === '' ? null : Number(v))
/** Days until an invoice is due: 0 is due on receipt, blank is not set (invoices then use 30). */
export function PaymentTermsField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <label className="text-sm">Payment terms, days after invoice<Input inputMode="numeric" maxLength={3} value={value} onChange={e => onChange(e.target.value.replace(/\D/g, ''))} placeholder="30 for Net 30, 0 for due on receipt" aria-describedby="terms-help" />
    <span id="terms-help" className="mt-1 block text-xs text-muted-foreground">0 to {MAX_TERMS_DAYS}. Leave blank if not agreed yet.</span></label>
}
