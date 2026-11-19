import { RawInvoiceRecord, ValidatedPaymentRecord, ValidationResult } from './types';

/**
 * Validates a raw invoice record against Bill Pay requirements.
 * Ensures required fields are present and amount is a positive number (> 0).
 * Invalid records are identified with clear failure reasons without crashing the batch.
 */
export function validateInvoiceRecord(raw: unknown): ValidationResult {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return {
      isValid: false,
      reason: 'Record must be a non-null object',
      rawRecord: raw,
    };
  }

  const record = raw as RawInvoiceRecord;
  const rawObj = raw as Record<string, unknown>;

  // 1. invoice_id validation
  const invoiceIdRaw = record.invoice_id ?? record.id;
  const invoiceId =
    invoiceIdRaw !== undefined && invoiceIdRaw !== null ? String(invoiceIdRaw).trim() : '';
  if (!invoiceId) {
    return {
      isValid: false,
      reason: "Missing required field: 'invoice_id'",
      rawRecord: raw,
    };
  }

  // 2. payee name validation (issuer_name from project `invoice-processor` schema)
  const payeeNameRaw = record.issuer_name ?? rawObj.payeeName ?? rawObj.payee ?? rawObj.vendor_name;
  const payeeName =
    payeeNameRaw !== undefined && payeeNameRaw !== null ? String(payeeNameRaw).trim() : '';
  if (!payeeName) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required field: 'issuer_name' (payee)",
      rawRecord: raw,
    };
  }

  // 3. Address fields validation
  const streetRaw =
    record.address?.street ??
    record.payee_address?.street ??
    record.street ??
    rawObj.address_street;
  const street = streetRaw !== undefined && streetRaw !== null ? String(streetRaw).trim() : '';
  if (!street) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required address field: 'street'",
      rawRecord: raw,
    };
  }

  const cityRaw =
    record.address?.city ?? record.payee_address?.city ?? record.city ?? rawObj.address_city;
  const city = cityRaw !== undefined && cityRaw !== null ? String(cityRaw).trim() : '';
  if (!city) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required address field: 'city'",
      rawRecord: raw,
    };
  }

  const stateRaw =
    record.address?.state ?? record.payee_address?.state ?? record.state ?? rawObj.address_state;
  const state = stateRaw !== undefined && stateRaw !== null ? String(stateRaw).trim() : '';
  if (!state) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required address field: 'state'",
      rawRecord: raw,
    };
  }

  const zipCodeRaw =
    record.address?.zipCode ??
    record.address?.zip_code ??
    record.payee_address?.zipCode ??
    record.payee_address?.zip_code ??
    record.zipCode ??
    record.zip_code ??
    rawObj.address_zip;
  const zipCode = zipCodeRaw !== undefined && zipCodeRaw !== null ? String(zipCodeRaw).trim() : '';
  if (!zipCode) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required address field: 'zipCode'",
      rawRecord: raw,
    };
  }

  // 4. Contact validation
  const phoneNumberRaw =
    record.phoneNumber ?? record.phone_number ?? record.payee_phone ?? rawObj.phone;
  const phoneNumber =
    phoneNumberRaw !== undefined && phoneNumberRaw !== null ? String(phoneNumberRaw).trim() : '';
  if (!phoneNumber) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required contact field: 'phoneNumber'",
      rawRecord: raw,
    };
  }

  // 5. Account number validation
  const accountNumberRaw =
    record.accountNumber ?? record.account_number ?? record.payee_account_number ?? rawObj.account;
  const accountNumber =
    accountNumberRaw !== undefined && accountNumberRaw !== null
      ? String(accountNumberRaw).trim()
      : '';
  if (!accountNumber) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required payment field: 'accountNumber'",
      rawRecord: raw,
    };
  }

  const verifyAccountRaw = record.verifyAccount ?? rawObj.verify_account ?? accountNumber;
  const verifyAccount = String(verifyAccountRaw).trim();

  // 6. Amount validation (total from project `invoice-processor` schema)
  const amountVal = record.total ?? record.amount;
  if (amountVal === undefined || amountVal === null) {
    return {
      isValid: false,
      invoiceId,
      reason: "Missing required numeric amount field: 'total'",
      rawRecord: raw,
    };
  }

  const numericAmount = typeof amountVal === 'number' ? amountVal : Number(amountVal);
  if (Number.isNaN(numericAmount) || !Number.isFinite(numericAmount)) {
    return {
      isValid: false,
      invoiceId,
      reason: `Amount must be a valid numeric value, received: ${String(amountVal)}`,
      rawRecord: raw,
    };
  }

  if (numericAmount <= 0) {
    return {
      isValid: false,
      invoiceId,
      reason: `Amount must be a positive number greater than 0, received: ${numericAmount}`,
      rawRecord: raw,
    };
  }

  const validated: ValidatedPaymentRecord = {
    invoiceId,
    invoiceNumber: (record.invoice_number ?? `INV-${invoiceId.slice(0, 8)}`).trim(),
    payeeName,
    street,
    city,
    state,
    zipCode,
    phoneNumber,
    accountNumber,
    verifyAccount,
    amount: Math.round(numericAmount * 100) / 100,
    currency: record.currency?.trim() || 'USD',
    rawRecord: record,
  };

  return {
    isValid: true,
    data: validated,
  };
}
