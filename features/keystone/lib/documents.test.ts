import test from 'node:test'
import assert from 'node:assert/strict'
import { validateUpload, safeFileName, documentStorageKey } from './documents'
import { signObjectRequest, objectStorageConfigured } from '../../integrations/storage'
const ok = { kind: 'other', fileName: 'Deal Memo (1).pdf', mimeType: 'application/pdf', byteSize: 1000, sha256: 'a'.repeat(64) }
test('accepts a valid declaration and normalizes the file name', () => { const v = validateUpload(ok); assert.equal(v.fileName, 'Deal-Memo-1-.pdf') })
for (const [n, p] of [['kind', { kind: 'x' }], ['type', { mimeType: 'application/x-msdownload' }], ['empty', { byteSize: 0 }], ['huge', { byteSize: 51 * 1048576 }], ['fraction', { byteSize: 1.5 }], ['checksum', { sha256: 'zz' }]] as any[]) test('rejects bad ' + n, () => assert.throws(() => validateUpload({ ...ok, ...p })))
test('rejects dotfiles and path tricks', () => { assert.throws(() => safeFileName('.env')); assert.throws(() => safeFileName('../../etc/passwd')); assert.equal(safeFileName('a/b/c.pdf'), 'a-b-c.pdf') })
test('storage keys are athlete-scoped and unguessable', () => { const a = documentStorageKey('ath1', 'f.pdf'), b = documentStorageKey('ath1', 'f.pdf'); assert.ok(a.startsWith('athletes/ath1/documents/')); assert.notEqual(a, b) })
test('unconfigured storage says so and refuses to sign', () => {
  const saved = { ...process.env }; for (const k of Object.keys(process.env)) if (k.startsWith('S3_')) delete process.env[k]
  try { assert.equal(objectStorageConfigured(), false); assert.throws(() => signObjectRequest('GET', { key: 'k', contentType: 'x', byteSize: 1, checksumSha256: 'a'.repeat(64) }), /required/) } finally { Object.assign(process.env, saved) }
})
test('configured storage signs a short-lived GET without leaking the secret', () => {
  const saved = { ...process.env }; Object.assign(process.env, { S3_ENDPOINT: 'https://s3.example.com', S3_BUCKET_NAME: 'b', S3_REGION: 'us-east-1', S3_ACCESS_KEY_ID: 'AKID', S3_SECRET_ACCESS_KEY: 'topsecret' })
  try { assert.equal(objectStorageConfigured(), true); const s = signObjectRequest('GET', { key: 'athletes/a/x.pdf', contentType: 'application/pdf', byteSize: 1, checksumSha256: 'a'.repeat(64) }, 99999); assert.ok(!s.url.includes('topsecret')); assert.match(s.url, /X-Amz-Expires=900/); assert.match(s.url, /X-Amz-Signature=[a-f0-9]{64}/) } finally { for (const k of ['S3_ENDPOINT', 'S3_BUCKET_NAME', 'S3_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY']) delete process.env[k]; Object.assign(process.env, saved) }
})
