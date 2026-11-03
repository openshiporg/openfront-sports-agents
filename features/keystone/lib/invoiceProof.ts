import crypto from 'node:crypto';
// Guest proof for one invoice (pattern: Restaurant cartProof). HMAC over invoiceId + expiry;
// it proves a guest looked the invoice up with the matching email and invoice number.
function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === 'production') throw new Error('SESSION_SECRET is required');
  return value || 'this secret should only be used in testing';
}
const mac = (invoiceId: string, exp: number) => crypto.createHmac('sha256', secret()).update(`invoice-proof:${invoiceId}:${exp}`).digest('base64url');
export function signInvoiceProof(invoiceId: string, ttlSeconds = 7200, now = Date.now()) {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${exp}.${mac(invoiceId, exp)}`;
}
export function verifyInvoiceProof(invoiceId: string, proof: unknown, now = Date.now()) {
  if (typeof proof !== 'string') return false;
  const [expText, sig] = proof.split('.');
  const exp = Number(expText);
  if (!Number.isInteger(exp) || !sig || exp < Math.floor(now / 1000)) return false;
  const expected = Buffer.from(mac(invoiceId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && crypto.timingSafeEqual(expected, given);
}
