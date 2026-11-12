import test from 'node:test'
import assert from 'node:assert/strict'
import { parseStatement, parseAmountCents, parseStatementDay, matchStatement, csvRows } from './statementImport'

test('amounts: exact cents, signs, brackets, thousands', () => {
  assert.equal(parseAmountCents('1,234.50'), 123450)
  assert.equal(parseAmountCents('-45.5'), -4550)
  assert.equal(parseAmountCents('(45.00)'), -4500)
  assert.equal(parseAmountCents('45.00-'), -4500)
  assert.equal(parseAmountCents('$12'), 1200)
  assert.equal(parseAmountCents('0.1'), 10)
  assert.equal(parseAmountCents('abc'), null)
  assert.equal(parseAmountCents('1.234'), null)
  assert.equal(parseAmountCents(''), null)
})

test('dates: iso, US, OFX; impossible dates rejected', () => {
  assert.equal(parseStatementDay('2026-10-02'), '2026-10-02')
  assert.equal(parseStatementDay('10/2/2026'), '2026-10-02')
  assert.equal(parseStatementDay('20261002120000[0:GMT]'), '2026-10-02')
  assert.equal(parseStatementDay('2026-02-30'), null)
  assert.equal(parseStatementDay('13/40/2026'), null)
  assert.equal(parseStatementDay('soon'), null)
})

test('csv: quotes, commas in cells, CRLF, blank lines', () => {
  assert.deepEqual(csvRows('a,"b,c",d\r\n\r\n"x ""y""",2,3\n'), [['a', 'b,c', 'd'], ['x "y"', '2', '3']])
})

test('csv with an Amount column and a running balance', () => {
  const p = parseStatement('Account,1234\nDate,Description,Amount,Balance\n10/02/2026,"Wire, ACME DEP-1",1000.00,1000.00\n10/20/2026,Check 118,-200.00,800.00\nnot a row,,,\n')
  assert.equal(p.format, 'csv'); assert.equal(p.lines.length, 2); assert.equal(p.skipped, 1)
  assert.deepEqual(p.lines[0], { date: '2026-10-02', cents: 100000, description: 'Wire, ACME DEP-1' })
  assert.equal(p.lines[1].cents, -20000)
  assert.equal(p.closingCents, 80000); assert.equal(p.closingDate, '2026-10-20')
})

test('csv with Debit and Credit columns', () => {
  const p = parseStatement('Date,Memo,Debit,Credit\n2026-10-02,Deposit,,500.00\n2026-10-03,Fee,12.00,\n')
  assert.deepEqual(p.lines.map((l) => l.cents), [50000, -1200]); assert.equal(p.closingCents, null)
})

test('csv without recognisable columns, empty and transaction-less files are refused', () => {
  assert.throws(() => parseStatement('foo,bar\n1,2\n'), /No header row/)
  assert.throws(() => parseStatement('   '), /empty/)
  assert.throws(() => parseStatement('Date,Amount\n'), /No transactions/)
})

const OFX = `OFXHEADER:100\n<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>\n<STMTTRN><TRNTYPE>CREDIT<DTPOSTED>20261002120000<TRNAMT>1000.00<FITID>A1<NAME>WIRE ACME<MEMO>DEP-1</STMTTRN>\n<STMTTRN><TRNTYPE>CHECK<DTPOSTED>20261020<TRNAMT>-200.00<FITID>A2<CHECKNUM>118</STMTTRN>\n<STMTTRN><DTPOSTED>bad<TRNAMT>5.00</STMTTRN>\n</BANKTRANLIST><LEDGERBAL><BALAMT>800.00<DTASOF>20261031</LEDGERBAL></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`
test('ofx: SGML-style transactions and ledger balance', () => {
  const p = parseStatement(OFX)
  assert.equal(p.format, 'ofx'); assert.equal(p.lines.length, 2); assert.equal(p.skipped, 1)
  assert.equal(p.lines[0].date, '2026-10-02'); assert.equal(p.lines[0].cents, 100000); assert.match(p.lines[0].description, /DEP-1/)
  assert.equal(p.lines[1].cents, -20000)
  assert.equal(p.closingCents, 80000); assert.equal(p.closingDate, '2026-10-31')
})

const open = [
  { id: 'd1', amountCents: 100000, reference: 'DEP-1', occurredOn: '2026-10-01', athlete: 'A' },
  { id: 'd2', amountCents: 100000, reference: 'DEP-2', occurredOn: '2026-10-02', athlete: 'B' },
  { id: 'w1', amountCents: -20000, reference: 'CHQ-118', occurredOn: '2026-10-19', athlete: 'A' },
  { id: 'far', amountCents: -20000, reference: 'CHQ-9', occurredOn: '2026-08-01', athlete: 'A' },
  { id: 'later', amountCents: 7000, reference: 'X', occurredOn: '2026-11-02', athlete: 'A' },
]
test('matching: same signed amount within the window, reference wins, each entry once', () => {
  const lines = [
    { date: '2026-10-02', cents: 100000, description: 'WIRE DEP-2' },
    { date: '2026-10-03', cents: 100000, description: 'WIRE' },
    { date: '2026-10-20', cents: -20000, description: 'Check 118' },
    { date: '2026-10-21', cents: -20000, description: 'duplicate' },
    { date: '2026-10-25', cents: 999, description: 'unknown' },
    { date: '2026-11-02', cents: 7000, description: 'after the statement' },
  ]
  const m = matchStatement(lines, open, '2026-10-31')
  assert.deepEqual(m.map((x) => x.entryId), ['d2', 'd1', 'w1', null, null])
})
test('matching: the opposite sign and dates outside the window never match', () => {
  const m = matchStatement([{ date: '2026-10-19', cents: 20000, description: '' }, { date: '2026-10-01', cents: -20000, description: '' }], open, '2026-10-31')
  assert.deepEqual(m.map((x) => x.entryId), [null, null])
})
