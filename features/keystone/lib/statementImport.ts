/**
 * Pure helpers that read a bank statement file (CSV or OFX/QFX text) in the browser and propose which open trust
 * entries it shows. Nothing is saved here: the operator still reviews the ticks and reconciles through
 * `reconcileTrustStatement`, which re-checks everything on the server.
 */
export type StatementLine = { date: string; cents: number; description: string }
export type ParsedStatement = { lines: StatementLine[]; closingCents: number | null; closingDate: string | null; format: 'csv' | 'ofx'; skipped: number }
export type OpenEntry = { id: string; amountCents: number; reference: string; occurredOn: string; athlete: string }
export type ImportMatch = { line: StatementLine; entryId: string | null }

const pad = (n: number | string) => String(n).padStart(2, '0')

/** Dates as YYYY-MM-DD from ISO, US M/D/Y, or OFX YYYYMMDD[HHMMSS...]. Null when not a real calendar date. */
export function parseStatementDay(raw: string): string | null {
  const s = raw.trim()
  let y: number, m: number, d: number
  let r = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T ].*)?$/.exec(s)
  if (r) { y = +r[1]; m = +r[2]; d = +r[3] }
  else if ((r = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s))) { m = +r[1]; d = +r[2]; y = +r[3] }
  else if ((r = /^(\d{4})(\d{2})(\d{2})(?:\d{0,6}.*)?$/.exec(s))) { y = +r[1]; m = +r[2]; d = +r[3] }
  else return null
  const iso = `${y}-${pad(m)}-${pad(d)}`
  const t = new Date(iso + 'T00:00:00Z')
  return Number.isNaN(t.getTime()) || t.toISOString().slice(0, 10) !== iso ? null : iso
}

/** Exact cents from "1,234.50", "$12", "(45.00)", "45.00-", "-45.5". Null when not an amount. */
export function parseAmountCents(raw: string): number | null {
  let s = raw.trim().replace(/[$\s]/g, '')
  if (!s) return null
  let neg = false
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1) }
  if (s.endsWith('-')) { neg = !neg; s = s.slice(0, -1) }
  if (s.startsWith('-')) { neg = !neg; s = s.slice(1) } else if (s.startsWith('+')) s = s.slice(1)
  s = s.replace(/,/g, '')
  const m = /^(\d{1,12})(?:\.(\d{1,2}))?$/.exec(s)
  if (!m) return null
  const c = Number(m[1]) * 100 + Number((m[2] || '').padEnd(2, '0'))
  return neg ? -c : c
}

/** Splits CSV text into rows, honouring quotes, doubled quotes and CRLF. */
export function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], cell = '', q = false
  const t = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]
    if (q) {
      if (ch === '"') { if (t[i + 1] === '"') { cell += '"'; i++ } else q = false } else cell += ch
    } else if (ch === '"') q = true
    else if (ch === ',') { row.push(cell); cell = '' }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && t[i + 1] === '\n') i++
      row.push(cell); cell = ''
      if (row.some((c) => c.trim())) rows.push(row)
      row = []
    } else cell += ch
  }
  row.push(cell)
  if (row.some((c) => c.trim())) rows.push(row)
  return rows
}

function parseOfx(text: string): ParsedStatement {
  const tag = (block: string, name: string) => new RegExp(`<${name}>\\s*([^<\\r\\n]*)`, 'i').exec(block)?.[1]?.trim() ?? ''
  const lines: StatementLine[] = []
  let skipped = 0
  for (const m of text.matchAll(/<STMTTRN>([\s\S]*?)(?=<\/STMTTRN>|<STMTTRN>|<\/BANKTRANLIST>|$)/gi)) {
    const date = parseStatementDay(tag(m[1], 'DTPOSTED'))
    const cents = parseAmountCents(tag(m[1], 'TRNAMT'))
    if (!date || cents == null) { skipped++; continue }
    lines.push({ date, cents, description: [tag(m[1], 'NAME'), tag(m[1], 'MEMO'), tag(m[1], 'CHECKNUM'), tag(m[1], 'FITID')].filter(Boolean).join(' ') })
  }
  const led = /<LEDGERBAL>([\s\S]*?)(?=<\/LEDGERBAL>|<AVAILBAL>|<\/STMTRS>|$)/i.exec(text)?.[1] ?? ''
  return { lines, closingCents: led ? parseAmountCents(tag(led, 'BALAMT')) : null, closingDate: led ? parseStatementDay(tag(led, 'DTASOF')) : null, format: 'ofx', skipped }
}

const find = (head: string[], re: RegExp) => head.findIndex((h) => re.test(h))

function parseCsv(text: string): ParsedStatement {
  const rows = csvRows(text)
  const hi = rows.findIndex((r) => r.some((c) => /date/i.test(c)) && r.some((c) => /amount|debit|credit|withdraw|deposit/i.test(c)))
  if (hi < 0) throw new Error('No header row found. The file needs a Date column and an Amount column (or Debit and Credit).')
  const head = rows[hi].map((h) => h.trim().toLowerCase())
  const di = find(head, /^(posting |posted |transaction |post |effective )?date/)
  const ai = find(head, /^amount/)
  const debit = find(head, /debit|withdraw/), credit = find(head, /credit|deposit/)
  const bi = find(head, /balance/)
  const desc = head.map((h, i) => (/descr|memo|payee|name|reference|details|check/.test(h) ? i : -1)).filter((i) => i >= 0)
  if (di < 0 || (ai < 0 && debit < 0 && credit < 0)) throw new Error('Could not find the Date and Amount columns.')
  const lines: StatementLine[] = []
  let skipped = 0, closing: number | null = null, closingDate: string | null = null
  for (const r of rows.slice(hi + 1)) {
    const date = parseStatementDay(r[di] || '')
    let cents: number | null = null
    if (ai >= 0) cents = parseAmountCents(r[ai] || '')
    else {
      const d = debit >= 0 ? parseAmountCents(r[debit] || '') : null, c = credit >= 0 ? parseAmountCents(r[credit] || '') : null
      if (d != null || c != null) cents = (c != null ? Math.abs(c) : 0) - (d != null ? Math.abs(d) : 0)
    }
    if (!date || cents == null) { skipped++; continue }
    lines.push({ date, cents, description: desc.map((i) => (r[i] || '').trim()).filter(Boolean).join(' ') })
    if (bi >= 0) {
      const b = parseAmountCents(r[bi] || '')
      if (b != null && (closingDate == null || date >= closingDate)) { closing = b; closingDate = date }
    }
  }
  return { lines, closingCents: closing, closingDate, format: 'csv', skipped }
}

/** Reads statement text. Throws a readable Error when it is not a usable CSV or OFX file. */
export function parseStatement(text: string): ParsedStatement {
  if (!text.trim()) throw new Error('The file is empty.')
  const out = /<STMTTRN>|<OFX>/i.test(text) ? parseOfx(text) : parseCsv(text)
  if (!out.lines.length) throw new Error('No transactions were found in the file.')
  return out
}

const dayNum = (d: string) => Math.round(Date.parse(d + 'T00:00:00Z') / 86400000)
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/**
 * Pairs statement lines with open trust entries: same signed amount, entry dated within `windowDays` of the line
 * (bank clearing lags), each entry used once. A reference found in the description wins, then the closest date.
 * Lines after `statementDate` are ignored. Ambiguous equal candidates are matched oldest first, never guessed twice.
 */
export function matchStatement(lines: StatementLine[], open: OpenEntry[], statementDate: string, windowDays = 7): ImportMatch[] {
  const used = new Set<string>()
  const eligible = lines.filter((l) => l.date <= statementDate)
  const order = eligible.map((l, i) => ({ l, i })).sort((a, b) => a.l.date.localeCompare(b.l.date) || a.i - b.i)
  const result = new Map<number, ImportMatch>()
  for (const { l, i } of order) {
    const hay = norm(l.description)
    const cands = open
      .filter((e) => !used.has(e.id) && e.amountCents === l.cents && e.occurredOn <= statementDate && Math.abs(dayNum(e.occurredOn) - dayNum(l.date)) <= windowDays)
      .map((e) => ({ e, ref: norm(e.reference).length >= 3 && hay.includes(norm(e.reference)) ? 0 : 1, gap: Math.abs(dayNum(e.occurredOn) - dayNum(l.date)) }))
      .sort((a, b) => a.ref - b.ref || a.gap - b.gap || a.e.occurredOn.localeCompare(b.e.occurredOn) || a.e.id.localeCompare(b.e.id))
    const pick = cands[0]?.e
    if (pick) used.add(pick.id)
    result.set(i, { line: l, entryId: pick ? pick.id : null })
  }
  return eligible.map((_, i) => result.get(i)!)
}
