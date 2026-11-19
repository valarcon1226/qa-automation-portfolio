import * as fs from 'fs';
import * as path from 'path';
import { chromium, Browser, BrowserContext, Page } from '@playwright/test';
import { BASE_URL } from '../playwright.config';
import { LoginPage } from '../src/pages/LoginPage';
import { BillPayPage } from '../src/pages/BillPayPage';
import {
  RawInvoiceRecord,
  ValidatedPaymentRecord,
  RunSummary,
  RunSummaryItem,
  RejectedRecordItem,
} from './types';
import { validateInvoiceRecord } from './validator';
import { withRetry, RetryFailureError } from './retry';
import { StateManager } from './state';
import { verifyConfirmationText, verifyAccountActivity } from './verifier';

export interface RunnerOptions {
  recordsPath?: string;
  statePath?: string;
  summaryPath?: string;
  rejectedPath?: string;
  baseUrl?: string;
  username?: string;
  password?: string;
  maxRetries?: number;
  initialBackoffMs?: number;
  backoffFactor?: number;
  headless?: boolean;
}

export class BillPayBatchRunner {
  private readonly options: Required<RunnerOptions>;
  private readonly stateManager: StateManager;

  constructor(opts: RunnerOptions = {}) {
    const baseDir = path.resolve(__dirname);
    this.options = {
      recordsPath: opts.recordsPath ?? path.join(baseDir, 'sample-records.json'),
      statePath: opts.statePath ?? path.join(baseDir, 'payment-state.json'),
      summaryPath: opts.summaryPath ?? path.join(baseDir, 'run-summary.json'),
      rejectedPath: opts.rejectedPath ?? path.join(baseDir, 'rejected-records.json'),
      baseUrl: opts.baseUrl ?? BASE_URL,
      username: opts.username ?? process.env.PARABANK_USER ?? 'john',
      password: opts.password ?? process.env.PARABANK_PASSWORD ?? 'demo',
      maxRetries: opts.maxRetries ?? 3,
      initialBackoffMs: opts.initialBackoffMs ?? 1000,
      backoffFactor: opts.backoffFactor ?? 2,
      headless: opts.headless ?? true,
    };
    this.stateManager = new StateManager(this.options.statePath);
  }

  public async run(): Promise<RunSummary> {
    const startedAt = new Date().toISOString();
    const runId = `run_${Date.now()}`;

    console.log(`[BillPayRunner] Starting batch run ${runId}`);
    console.log(`[BillPayRunner] Reading records from: ${this.options.recordsPath}`);
    console.log(`[BillPayRunner] Target Base URL: ${this.options.baseUrl}`);
    console.log(`[BillPayRunner] Target Browser: Microsoft Edge (channel msedge)`);

    // 1. Load records from JSON
    if (!fs.existsSync(this.options.recordsPath)) {
      throw new Error(`Records file not found at: ${this.options.recordsPath}`);
    }

    const rawFileContent = fs.readFileSync(this.options.recordsPath, 'utf-8');
    const rawRecords: unknown[] = JSON.parse(rawFileContent);
    if (!Array.isArray(rawRecords)) {
      throw new Error(`Expected JSON file to contain an array of invoice records.`);
    }

    const totalRecordsInput = rawRecords.length;
    const summaryItems: RunSummaryItem[] = [];
    const rejectedItems: RejectedRecordItem[] = [];
    const attemptsPerRecord: Record<string, number> = {};

    const validQueue: ValidatedPaymentRecord[] = [];

    // 2. Pre-flight validation & idempotency check
    for (const raw of rawRecords) {
      const rawObj = raw as RawInvoiceRecord;
      const invoiceId = (rawObj?.invoice_id ?? rawObj?.id)?.toString().trim() ?? 'UNKNOWN_ID';

      // Check idempotency first: already completed?
      if (this.stateManager.isAlreadyCompleted(invoiceId)) {
        console.log(
          `[BillPayRunner] Record ${invoiceId} already successfully VERIFIED in state. Skipping (Idempotent).`,
        );
        attemptsPerRecord[invoiceId] = 0;
        summaryItems.push({
          invoiceId,
          invoiceNumber: rawObj?.invoice_number,
          status: 'SKIPPED_ALREADY_PAID',
          attempts: 0,
          payee: rawObj?.issuer_name,
          amount: rawObj?.total ?? rawObj?.amount,
          details: 'Skipped to preserve idempotency; already paid and verified in previous run.',
        });
        continue;
      }

      // Validate schema and business rules
      const validation = validateInvoiceRecord(raw);
      if (!validation.isValid) {
        console.warn(
          `[BillPayRunner] Rejected invalid record [${invoiceId}]: ${validation.reason}`,
        );
        attemptsPerRecord[invoiceId] = 0;
        rejectedItems.push({
          invoiceId: validation.invoiceId,
          reason: validation.reason,
          rawRecord: validation.rawRecord,
        });
        summaryItems.push({
          invoiceId,
          invoiceNumber: rawObj?.invoice_number,
          status: 'REJECTED',
          attempts: 0,
          error: validation.reason,
        });
        continue;
      }

      // Valid record ready for execution
      validQueue.push(validation.data);
    }

    let sent = 0;
    let verified = 0;
    let failed = 0;

    let browser: Browser | null = null;
    let context: BrowserContext | null = null;
    let page: Page | null = null;

    if (validQueue.length > 0) {
      try {
        console.log(`[BillPayRunner] Launching Microsoft Edge (channel msedge)...`);
        browser = await chromium.launch({
          channel: 'msedge',
          headless: this.options.headless,
        });

        context = await browser.newContext({
          baseURL: this.options.baseUrl,
        });

        page = await context.newPage();

        // Login to ParaBank
        console.log(`[BillPayRunner] Authenticating with user: ${this.options.username}`);
        const loginPage = new LoginPage(page);
        await loginPage.goto();
        await loginPage.login(this.options.username, this.options.password);

        // Process each valid record with retry logic
        for (const record of validQueue) {
          const invoiceId = record.invoiceId;
          console.log(
            `\n[BillPayRunner] Processing invoice ${record.invoiceNumber} (${invoiceId}) -> Payee: ${record.payeeName}, Amount: $${record.amount.toFixed(2)}`,
          );

          try {
            const retryResult = await withRetry(
              async (attemptNumber) => {
                console.log(
                  `[BillPayRunner] [${invoiceId}] Attempt ${attemptNumber}/${this.options.maxRetries}...`,
                );
                return await this.executeBillPayment(page!, record);
              },
              {
                maxRetries: this.options.maxRetries,
                initialBackoffMs: this.options.initialBackoffMs,
                backoffFactor: this.options.backoffFactor,
              },
            );

            // Successfully processed and verified
            sent++;
            verified++;
            attemptsPerRecord[invoiceId] = retryResult.attempts;

            this.stateManager.updateRecord({
              invoiceId,
              status: 'VERIFIED',
              payeeName: record.payeeName,
              amount: record.amount,
              fromAccountId: retryResult.result.fromAccountId,
              attempts: retryResult.attempts,
              completedAt: new Date().toISOString(),
            });

            summaryItems.push({
              invoiceId,
              invoiceNumber: record.invoiceNumber,
              status: 'VERIFIED',
              attempts: retryResult.attempts,
              payee: record.payeeName,
              amount: record.amount,
              fromAccountId: retryResult.result.fromAccountId,
              details: `Payment confirmed and verified in account activity for account ${retryResult.result.fromAccountId}`,
            });

            console.log(
              `[BillPayRunner] [${invoiceId}] Successfully VERIFIED on attempt ${retryResult.attempts}.`,
            );
          } catch (err) {
            failed++;
            const retryErr = err as Partial<RetryFailureError>;
            const attemptsMade = retryErr.attempts ?? 1;
            attemptsPerRecord[invoiceId] = attemptsMade;

            const errorMsg =
              err instanceof Error
                ? err.message
                : typeof err === 'object' && err !== null && 'error' in err
                  ? String((err as { error: unknown }).error)
                  : String(err);

            console.error(
              `[BillPayRunner] [${invoiceId}] FAILED after ${attemptsMade} attempts: ${errorMsg}`,
            );

            // Submitted but not verified stays SENT: the next run re-verifies, never re-pays.
            const wasSent = this.stateManager.getRecord(invoiceId)?.status === 'SENT';
            if (wasSent) sent++;

            this.stateManager.updateRecord({
              invoiceId,
              status: wasSent ? 'SENT' : 'FAILED',
              payeeName: record.payeeName,
              amount: record.amount,
              attempts: attemptsMade,
              error: errorMsg,
            });

            summaryItems.push({
              invoiceId,
              invoiceNumber: record.invoiceNumber,
              status: wasSent ? 'SENT' : 'FAILED',
              attempts: attemptsMade,
              payee: record.payeeName,
              amount: record.amount,
              error: errorMsg,
            });
          }
        }
      } catch (browserErr) {
        const fatalMsg = browserErr instanceof Error ? browserErr.message : String(browserErr);
        console.error(`[BillPayRunner] Fatal automation or connection error: ${fatalMsg}`);

        // Mark remaining valid records as failed due to browser/network failure
        for (const record of validQueue) {
          if (!attemptsPerRecord[record.invoiceId]) {
            failed++;
            attemptsPerRecord[record.invoiceId] = 1;
            summaryItems.push({
              invoiceId: record.invoiceId,
              invoiceNumber: record.invoiceNumber,
              status: 'FAILED',
              attempts: 1,
              payee: record.payeeName,
              amount: record.amount,
              error: `Batch interrupted by environment/connection failure: ${fatalMsg}`,
            });
          }
        }
      } finally {
        if (context) {
          await context.close().catch(() => {});
        }
        if (browser) {
          await browser.close().catch(() => {});
        }
      }
    }

    const completedAt = new Date().toISOString();
    const skipped = summaryItems.filter((i) => i.status === 'SKIPPED_ALREADY_PAID').length;
    const rejected = rejectedItems.length;

    const summary: RunSummary = {
      runId,
      startedAt,
      completedAt,
      totalRecordsInput,
      sent,
      verified,
      rejected,
      failed,
      skipped,
      attemptsPerRecord,
      records: summaryItems,
      rejectedRecords: rejectedItems,
    };

    // Save summary JSON
    const summaryDir = path.dirname(this.options.summaryPath);
    if (!fs.existsSync(summaryDir)) {
      fs.mkdirSync(summaryDir, { recursive: true });
    }
    fs.writeFileSync(this.options.summaryPath, JSON.stringify(summary, null, 2), 'utf-8');
    console.log(`\n[BillPayRunner] Run summary written to: ${this.options.summaryPath}`);

    // Save rejected records JSON
    const rejectedDir = path.dirname(this.options.rejectedPath);
    if (!fs.existsSync(rejectedDir)) {
      fs.mkdirSync(rejectedDir, { recursive: true });
    }
    fs.writeFileSync(this.options.rejectedPath, JSON.stringify(rejectedItems, null, 2), 'utf-8');
    console.log(`[BillPayRunner] Rejected records written to: ${this.options.rejectedPath}`);

    console.log(`\n================ BATCH EXECUTION SUMMARY ================`);
    console.log(`Total input: ${totalRecordsInput}`);
    console.log(`Sent:        ${sent}`);
    console.log(`Verified:    ${verified}`);
    console.log(`Rejected:    ${rejected}`);
    console.log(`Failed:      ${failed}`);
    console.log(`Skipped:     ${skipped}`);
    console.log(`=========================================================\n`);

    return summary;
  }

  /**
   * Submits a single bill payment and verifies both the confirmation screen and account activity.
   */
  private async executeBillPayment(
    page: Page,
    record: ValidatedPaymentRecord,
  ): Promise<{ fromAccountId: string }> {
    // A record already marked SENT (by an earlier attempt or an earlier run) is never
    // submitted again: money may have moved. Only the verification is repeated.
    const prior = this.stateManager.getRecord(record.invoiceId);
    let fromAccountId = prior?.status === 'SENT' ? prior.fromAccountId : undefined;

    if (!fromAccountId) {
      const billPayPage = new BillPayPage(page);

      // 1. Navigate to Bill Pay
      await billPayPage.goto();

      // 2. Wait for form controls
      await billPayPage.payeeNameInput.waitFor({ state: 'visible', timeout: 10000 });

      // 3. Fill form fields
      await billPayPage.payeeNameInput.fill(record.payeeName);
      await billPayPage.streetInput.fill(record.street);
      await billPayPage.cityInput.fill(record.city);
      await billPayPage.stateInput.fill(record.state);
      await billPayPage.zipCodeInput.fill(record.zipCode);
      await billPayPage.phoneNumberInput.fill(record.phoneNumber);
      await billPayPage.accountNumberInput.fill(record.accountNumber);
      await billPayPage.verifyAccountInput.fill(record.verifyAccount);
      await billPayPage.amountInput.fill(record.amount.toFixed(2));

      // Wait for account options to load
      await billPayPage.fromAccountSelect
        .locator('option')
        .first()
        .waitFor({ state: 'attached', timeout: 10000 });

      fromAccountId = await billPayPage.fromAccountSelect.inputValue();

      // 4. Record SENT before the click, so a timeout or crash after it cannot cause a
      // second payment. ponytail: if the click itself never reaches the server the record
      // stays SENT and needs a manual look; a double payment is the worse failure.
      this.stateManager.updateRecord({
        invoiceId: record.invoiceId,
        status: 'SENT',
        payeeName: record.payeeName,
        amount: record.amount,
        fromAccountId,
        attempts: prior?.attempts ?? 0,
      });
      await billPayPage.sendPaymentButton.click();

      // 5. Wait for confirmation
      await billPayPage.successResult.waitFor({ state: 'visible', timeout: 10000 });
      const confirmationText = (await billPayPage.successResult.textContent()) ?? '';

      // 6. Verify confirmation screen
      const confResult = verifyConfirmationText(confirmationText, record.payeeName, record.amount);
      if (!confResult.verified) {
        throw new Error(`Confirmation verification failed: ${confResult.error}`);
      }
    }

    // 7. Verify account activity table
    const actResult = await verifyAccountActivity(
      page,
      fromAccountId,
      record.payeeName,
      record.amount,
      10000,
    );
    if (!actResult.verified) {
      throw new Error(`Account activity verification failed: ${actResult.error}`);
    }

    return { fromAccountId };
  }
}
