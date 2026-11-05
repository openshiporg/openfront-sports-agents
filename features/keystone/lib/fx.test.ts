import test from 'node:test'
import assert from 'node:assert/strict'
import { parseRateMicros, convertCents, receiptFx, formatRate, parseCurrency } from './fx'
test('rates are whole numbers or up to 6 decimals, above zero', () => {
  assert.equal(parseRateMicros('1.085'), 1_085_000); assert.equal(parseRateMicros(' 0.000001 '), 1); assert.equal(parseRateMicros('150'), 150_000_000); assert.equal(parseRateMicros(1.25), 1_250_000)
  for (const bad of ['', 'abc', '0', '0.0', '-1', '1.1234567', '1,5', '1e3', '1234567']) assert.throws(() => parseRateMicros(bad), /exchange rate/)
})
test('conversion is exact and rounds half up', () => {
  assert.equal(convertCents(10000, 1_085_000), 10850); assert.equal(convertCents(1, 500_000), 1); assert.equal(convertCents(1, 499_999), 0); assert.equal(convertCents(3, 500_000), 2)
  assert.equal(convertCents(9_000_000_000_00, 1_085_000), 9_765_000_000_00); assert.equal(convertCents(0, 1_085_000), 0)
  assert.throws(() => convertCents(-1, 1), /Invalid amount/)
})
test('receipt fx: same currency stores rate 1 and refuses a different rate; foreign requires a rate', () => {
  assert.deepEqual(receiptFx('USD', 'USD', 500, ''), { fxRateMicros: 1_000_000, baseCurrencyCode: 'USD', baseCommissionCents: 500 })
  assert.deepEqual(receiptFx('USD', 'USD', 500, '1'), { fxRateMicros: 1_000_000, baseCurrencyCode: 'USD', baseCommissionCents: 500 })
  assert.throws(() => receiptFx('USD', 'USD', 500, '1.1'), /already in USD/)
  assert.throws(() => receiptFx('EUR', 'USD', 500, ''), /Enter the exchange rate to USD for this EUR payment/)
  assert.deepEqual(receiptFx('EUR', 'USD', 15000, '1.0850'), { fxRateMicros: 1_085_000, baseCurrencyCode: 'USD', baseCommissionCents: 16275 })
})
test('format and currency codes', () => {
  assert.equal(formatRate(1_085_000), '1.0850'); assert.equal(formatRate(150_000_000), '150.0000'); assert.equal(formatRate(1), '0.000001')
  assert.equal(parseCurrency(' eur ', 'USD'), 'EUR'); assert.equal(parseCurrency('', 'USD'), 'USD'); assert.throws(() => parseCurrency('EURO', 'USD'), /three-letter/)
})
