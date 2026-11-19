import assert from 'node:assert';
import * as fs from 'fs';
import * as path from 'path';
import { validateInvoiceRecord } from './validator';
import { withRetry, isTransientError } from './retry';
import { StateManager } from './state';
import { verifyConfirmationText } from './verifier';
import { RawInvoiceRecord } from './types';

let passed = 0;
let failed = 0;

async function runTest(name: string, fn: () => void | Promise<void>): Promise<void> {
  try {
    await fn();
    console.log(`  [PASS] ${name}`);
    passed++;
  } catch (err) {
    console.error(`  [FAIL] ${name}`);
    console.error(`         ${err instanceof Error ? err.message : String(err)}`);
    failed++;
  }
}

async function main(): Promise<void> {
  console.log('====================================================');
  console.log('Running Automation Unit Tests (Validation & Retry Logic)');
  console.log('====================================================\n');

  console.log('--- 1. Validation Logic Tests ---');

  await runTest('Valid invoice record passes validation', () => {
    const validRecord: RawInvoiceRecord = {
      invoice_id: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
      invoice_number: 'INV-2026-001',
      issuer_name: 'Metro Electric Service',
      total: 125.75,
      address: {
        street: '100 Power Blvd',
        city: 'Chicago',
        state: 'IL',
        zipCode: '60601',
      },
      phoneNumber: '312-555-0100',
      accountNumber: '998877',
      currency: 'USD',
    };

    const result = validateInvoiceRecord(validRecord);
    assert.strictEqual(result.isValid, true);
    if (result.isValid) {
      assert.strictEqual(result.data.invoiceId, 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d');
      assert.strictEqual(result.data.payeeName, 'Metro Electric Service');
      assert.strictEqual(result.data.amount, 125.75);
      assert.strictEqual(result.data.street, '100 Power Blvd');
    }
  });

  await runTest('Record missing invoice_id is rejected', () => {
    const record = {
      issuer_name: 'Metro Electric',
      total: 100,
      street: '100 Main St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      phoneNumber: '555-0100',
      accountNumber: '12345',
    };
    const result = validateInvoiceRecord(record);
    assert.strictEqual(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.reason, /invoice_id/i);
    }
  });

  await runTest('Record missing issuer_name (payee) is rejected', () => {
    const record: RawInvoiceRecord = {
      invoice_id: 'inv-002',
      total: 100,
      street: '100 Main St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      phoneNumber: '555-0100',
      accountNumber: '12345',
    };
    const result = validateInvoiceRecord(record);
    assert.strictEqual(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.reason, /issuer_name/i);
    }
  });

  await runTest('Record with missing address field (city) is rejected', () => {
    const record: RawInvoiceRecord = {
      invoice_id: 'inv-003',
      issuer_name: 'Metro Electric',
      total: 100,
      street: '100 Main St',
      state: 'IL',
      zipCode: '60601',
      phoneNumber: '555-0100',
      accountNumber: '12345',
    };
    const result = validateInvoiceRecord(record);
    assert.strictEqual(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.reason, /city/i);
    }
  });

  await runTest('Record with negative amount is rejected', () => {
    const record: RawInvoiceRecord = {
      invoice_id: 'inv-004',
      issuer_name: 'Metro Electric',
      total: -95.0,
      street: '100 Main St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      phoneNumber: '555-0100',
      accountNumber: '12345',
    };
    const result = validateInvoiceRecord(record);
    assert.strictEqual(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.reason, /positive number/i);
    }
  });

  await runTest('Record with zero amount is rejected', () => {
    const record: RawInvoiceRecord = {
      invoice_id: 'inv-005',
      issuer_name: 'Metro Electric',
      total: 0,
      street: '100 Main St',
      city: 'Chicago',
      state: 'IL',
      zipCode: '60601',
      phoneNumber: '555-0100',
      accountNumber: '12345',
    };
    const result = validateInvoiceRecord(record);
    assert.strictEqual(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.reason, /positive number/i);
    }
  });

  await runTest('Record 4 in sample-records.json is rejected as expected', () => {
    const samplePath = path.resolve(__dirname, 'sample-records.json');
    const records = JSON.parse(fs.readFileSync(samplePath, 'utf-8'));
    assert.strictEqual(records.length, 5);

    const invalidSample = records[3];
    assert.strictEqual(invalidSample.invoice_number, 'INV-2026-004-INVALID');

    const result = validateInvoiceRecord(invalidSample);
    assert.strictEqual(result.isValid, false);
    if (!result.isValid) {
      assert.match(result.reason, /positive number/i);
    }
  });

  console.log('\n--- 2. Transient Error Detection Tests ---');

  await runTest('isTransientError identifies timeouts and network drops', () => {
    assert.strictEqual(
      isTransientError(new Error('Navigation timeout of 30000 ms exceeded')),
      true,
    );
    assert.strictEqual(
      isTransientError(new Error('net::ERR_CONNECTION_REFUSED at http://127.0.0.1:8640')),
      true,
    );
    assert.strictEqual(isTransientError(new Error('connect ECONNREFUSED 127.0.0.1:8640')), true);
    assert.strictEqual(isTransientError(new Error('Target closed')), true);
    assert.strictEqual(isTransientError(new Error('Invalid password provided')), false);
    assert.strictEqual(isTransientError(new Error('Verification amount mismatch')), false);
  });

  console.log('\n--- 3. Retry Logic & Exponential Backoff Tests ---');

  await runTest('Operation succeeding on first attempt requires 1 attempt', async () => {
    let callCount = 0;
    const res = await withRetry(
      async () => {
        callCount++;
        return 'success';
      },
      { maxRetries: 3 },
    );
    assert.strictEqual(res.result, 'success');
    assert.strictEqual(res.attempts, 1);
    assert.strictEqual(callCount, 1);
  });

  await runTest(
    'Transient failure retries and succeeds on attempt 2 with increasing backoff',
    async () => {
      let callCount = 0;
      const sleepDelays: number[] = [];

      const res = await withRetry(
        async (attempt) => {
          callCount++;
          if (attempt === 1) {
            throw new Error('Navigation timeout of 10000ms');
          }
          return 'recovered';
        },
        {
          maxRetries: 3,
          initialBackoffMs: 50,
          backoffFactor: 2,
          sleepFn: async (ms) => {
            sleepDelays.push(ms);
          },
        },
      );

      assert.strictEqual(res.result, 'recovered');
      assert.strictEqual(res.attempts, 2);
      assert.strictEqual(callCount, 2);
      assert.deepStrictEqual(sleepDelays, [50]);
    },
  );

  await runTest('Transient failure retrying until maxRetries exhausted throws error', async () => {
    let callCount = 0;
    const sleepDelays: number[] = [];

    try {
      await withRetry(
        async () => {
          callCount++;
          throw new Error('connect ECONNREFUSED 127.0.0.1:8640');
        },
        {
          maxRetries: 3,
          initialBackoffMs: 100,
          backoffFactor: 2,
          sleepFn: async (ms) => {
            sleepDelays.push(ms);
          },
        },
      );
      assert.fail('Expected withRetry to throw');
    } catch (err: unknown) {
      const e = err as { attempts: number; isTransient: boolean };
      assert.strictEqual(e.attempts, 3);
      assert.strictEqual(e.isTransient, true);
      assert.strictEqual(callCount, 3);
      assert.deepStrictEqual(sleepDelays, [100, 200]);
    }
  });

  await runTest('Non-transient error fails immediately on attempt 1 without retrying', async () => {
    let callCount = 0;
    const sleepDelays: number[] = [];

    try {
      await withRetry(
        async () => {
          callCount++;
          throw new Error('Business rule violation: invalid account');
        },
        {
          maxRetries: 5,
          sleepFn: async (ms) => {
            sleepDelays.push(ms);
          },
        },
      );
      assert.fail('Expected withRetry to throw');
    } catch (err: unknown) {
      const e = err as { attempts: number; isTransient: boolean };
      assert.strictEqual(e.attempts, 1);
      assert.strictEqual(e.isTransient, false);
      assert.strictEqual(callCount, 1);
      assert.strictEqual(sleepDelays.length, 0);
    }
  });

  console.log('\n--- 4. Idempotency State Management Tests ---');

  await runTest(
    'StateManager marks verified records as completed and prevents duplicate runs',
    () => {
      const testStateFile = path.resolve(__dirname, 'test-temp-state.json');
      if (fs.existsSync(testStateFile)) {
        fs.unlinkSync(testStateFile);
      }

      try {
        const sm = new StateManager(testStateFile);
        assert.strictEqual(sm.isAlreadyCompleted('test-inv-01'), false);

        sm.updateRecord({
          invoiceId: 'test-inv-01',
          status: 'VERIFIED',
          payeeName: 'Test Vendor',
          amount: 50.0,
          attempts: 1,
          completedAt: new Date().toISOString(),
        });

        assert.strictEqual(sm.isAlreadyCompleted('test-inv-01'), true);

        // Re-instantiate to verify persistence
        const sm2 = new StateManager(testStateFile);
        assert.strictEqual(sm2.isAlreadyCompleted('test-inv-01'), true);
        assert.strictEqual(sm2.getRecord('test-inv-01')?.amount, 50.0);
      } finally {
        if (fs.existsSync(testStateFile)) {
          fs.unlinkSync(testStateFile);
        }
      }
    },
  );

  console.log('\n--- 5. Verification Logic Tests ---');

  await runTest('verifyConfirmationText verifies matching text', () => {
    const text =
      'Bill Payment to Clean Grid Energy in the amount of $126.00 from account 12345 was successful.';
    const res = verifyConfirmationText(text, 'Clean Grid Energy', 126.0);
    assert.strictEqual(res.verified, true);
    assert.strictEqual(res.extractedPayee, 'Clean Grid Energy');
    assert.strictEqual(res.extractedAmount, 126.0);
    assert.strictEqual(res.extractedAccountId, '12345');
  });

  await runTest('verifyConfirmationText rejects mismatched payee name', () => {
    const text =
      'Bill Payment to Wrong Corp in the amount of $126.00 from account 12345 was successful.';
    const res = verifyConfirmationText(text, 'Clean Grid Energy', 126.0);
    assert.strictEqual(res.verified, false);
    assert.match(res.error ?? '', /payee mismatch/i);
  });

  await runTest('verifyConfirmationText rejects mismatched amount', () => {
    const text =
      'Bill Payment to Clean Grid Energy in the amount of $999.00 from account 12345 was successful.';
    const res = verifyConfirmationText(text, 'Clean Grid Energy', 126.0);
    assert.strictEqual(res.verified, false);
    assert.match(res.error ?? '', /amount mismatch/i);
  });

  console.log('\n====================================================');
  console.log(`Test Results: ${passed} passed, ${failed} failed`);
  console.log('====================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

void main();
