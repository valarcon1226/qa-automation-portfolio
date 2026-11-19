/**
 * Types and interfaces for the ParaBank Bill Pay batch automation.
 * Conforms to project 05 invoice extraction schemas while mapping fields
 * needed for ParaBank Bill Pay form submission.
 */

export interface InvoiceAddress {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  zip_code?: string;
}

export interface RawInvoiceRecord {
  invoice_id?: string;
  id?: string;
  invoice_number?: string;
  original_filename?: string;
  minio_key?: string;
  issuer_name?: string;
  issuer_vat?: string;
  recipient_name?: string;
  recipient_vat?: string;
  invoice_date?: string;
  due_date?: string;
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total?: number;
  amount?: number;
  currency?: string;
  is_valid?: boolean;
  validation_errors?: string[];
  status?: string;

  // Address fields (nested or flat)
  address?: InvoiceAddress;
  payee_address?: InvoiceAddress;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  zip_code?: string;

  // Contact / Account fields
  phoneNumber?: string;
  phone_number?: string;
  payee_phone?: string;

  accountNumber?: string | number;
  account_number?: string | number;
  payee_account_number?: string | number;
  verifyAccount?: string | number;
}

export interface ValidatedPaymentRecord {
  invoiceId: string;
  invoiceNumber: string;
  payeeName: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  phoneNumber: string;
  accountNumber: string;
  verifyAccount: string;
  amount: number;
  currency: string;
  rawRecord: RawInvoiceRecord;
}

export interface ValidationSuccess {
  isValid: true;
  data: ValidatedPaymentRecord;
}

export interface ValidationFailure {
  isValid: false;
  reason: string;
  invoiceId?: string;
  rawRecord: unknown;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

export type PaymentStatus =
  | 'PENDING'
  | 'SENT'
  | 'VERIFIED'
  | 'FAILED'
  | 'REJECTED'
  | 'SKIPPED_ALREADY_PAID';

export interface RecordState {
  invoiceId: string;
  status: PaymentStatus;
  payeeName: string;
  amount: number;
  fromAccountId?: string;
  attempts: number;
  completedAt?: string;
  lastAttemptAt?: string;
  error?: string;
}

export interface StateFileContent {
  lastUpdated: string;
  records: Record<string, RecordState>;
}

export interface RetryOptions {
  maxRetries?: number;
  initialBackoffMs?: number;
  backoffFactor?: number;
  sleepFn?: (ms: number) => Promise<void>;
}

export interface RunSummaryItem {
  invoiceId: string;
  invoiceNumber?: string;
  status: PaymentStatus;
  attempts: number;
  payee?: string;
  amount?: number;
  fromAccountId?: string;
  details?: string;
  error?: string;
}

export interface RejectedRecordItem {
  invoiceId?: string;
  reason: string;
  rawRecord: unknown;
}

export interface RunSummary {
  runId: string;
  startedAt: string;
  completedAt: string;
  totalRecordsInput: number;
  sent: number;
  verified: number;
  rejected: number;
  failed: number;
  skipped: number;
  attemptsPerRecord: Record<string, number>;
  records: RunSummaryItem[];
  rejectedRecords: RejectedRecordItem[];
}
