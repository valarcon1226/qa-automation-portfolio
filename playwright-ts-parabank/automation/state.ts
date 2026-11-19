import * as fs from 'fs';
import * as path from 'path';
import { RecordState, StateFileContent } from './types';

/**
 * Manages persistent payment state to guarantee idempotency across runs and retries.
 * Prevents submitting duplicate payments for already-verified invoice IDs.
 */
export class StateManager {
  private readonly filePath: string;
  private state: StateFileContent;

  constructor(filePath?: string) {
    this.filePath = filePath ?? path.resolve(__dirname, 'payment-state.json');
    this.state = this.load();
  }

  private load(): StateFileContent {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && typeof parsed.records === 'object') {
          return parsed as StateFileContent;
        }
      }
    } catch {
      // In case of read/parse failure, initialize clean state
    }
    return {
      lastUpdated: new Date().toISOString(),
      records: {},
    };
  }

  /**
   * Returns true if the invoice record was already successfully paid and verified.
   */
  public isAlreadyCompleted(invoiceId: string): boolean {
    const entry = this.state.records[invoiceId];
    return entry?.status === 'VERIFIED';
  }

  /**
   * Returns current state for an invoice record, if any.
   */
  public getRecord(invoiceId: string): RecordState | undefined {
    return this.state.records[invoiceId];
  }

  /**
   * Updates state for an invoice and persists to disk.
   */
  public updateRecord(record: RecordState): void {
    const existing = this.state.records[record.invoiceId];
    this.state.records[record.invoiceId] = {
      ...existing,
      ...record,
      lastAttemptAt: new Date().toISOString(),
    };
    this.save();
  }

  /**
   * Flushes current state to disk.
   */
  public save(): void {
    this.state.lastUpdated = new Date().toISOString();
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2), 'utf-8');
  }

  /**
   * Returns snapshot of all recorded records.
   */
  public getAll(): Record<string, RecordState> {
    return { ...this.state.records };
  }

  /**
   * Clears internal state (useful for test isolation).
   */
  public clear(): void {
    this.state.records = {};
    this.save();
  }
}
