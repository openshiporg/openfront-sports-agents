import {test} from 'node:test';
import assert from 'node:assert/strict';
import {signInvoiceProof,verifyInvoiceProof} from './invoiceProof';
test('proof verifies for its invoice only',()=>{const p=signInvoiceProof('inv1');assert.equal(verifyInvoiceProof('inv1',p),true);assert.equal(verifyInvoiceProof('inv2',p),false);});
test('expired, tampered and malformed proofs fail',()=>{const p=signInvoiceProof('inv1',10,1000);assert.equal(verifyInvoiceProof('inv1',p,1000+11_000),false);const [e,s]=signInvoiceProof('inv1').split('.');assert.equal(verifyInvoiceProof('inv1',`${Number(e)+999}.${s}`),false);for(const bad of [undefined,'',null,'x','1.2.3'])assert.equal(verifyInvoiceProof('inv1',bad),false);});
