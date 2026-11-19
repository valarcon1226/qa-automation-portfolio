import { Page } from '@playwright/test';

export interface ConfirmationVerification {
  verified: boolean;
  error?: string;
  extractedPayee?: string;
  extractedAmount?: number;
  extractedAccountId?: string;
}

export interface ActivityVerification {
  verified: boolean;
  error?: string;
  matchedTransaction?: {
    date: string;
    description: string;
    amount: string;
  };
}

/**
 * Validates the confirmation screen after submitting Bill Pay.
 * Expected ParaBank confirmation format:
 * "Bill Payment to <payee> in the amount of $<amount> from account <fromAccountId> was successful."
 */
export function verifyConfirmationText(
  confirmationText: string,
  expectedPayee: string,
  expectedAmount: number,
): ConfirmationVerification {
  const clean = confirmationText.replace(/\s+/g, ' ').trim();

  // Pattern matches ParaBank's success paragraph
  const match = clean.match(
    /Bill Payment to (.*?) in the amount of \$([\d,.]+) from account (\d+) was successful/i,
  );

  if (!match) {
    return {
      verified: false,
      error: `Confirmation text did not match ParaBank success pattern. Content: "${clean}"`,
    };
  }

  const extractedPayee = match[1].trim();
  const extractedAmountStr = match[2].replace(/,/g, '').trim();
  const extractedAmount = parseFloat(extractedAmountStr);
  const extractedAccountId = match[3].trim();

  // Validate Payee
  if (extractedPayee.toLowerCase() !== expectedPayee.trim().toLowerCase()) {
    return {
      verified: false,
      error: `Confirmation payee mismatch: expected "${expectedPayee}", received "${extractedPayee}"`,
      extractedPayee,
      extractedAmount,
      extractedAccountId,
    };
  }

  // Validate Amount
  if (Math.abs(extractedAmount - expectedAmount) > 0.01) {
    return {
      verified: false,
      error: `Confirmation amount mismatch: expected $${expectedAmount.toFixed(2)}, received $${extractedAmount.toFixed(2)}`,
      extractedPayee,
      extractedAmount,
      extractedAccountId,
    };
  }

  return {
    verified: true,
    extractedPayee,
    extractedAmount,
    extractedAccountId,
  };
}

/**
 * Navigates to the account activity view and confirms that the debit transaction
 * was persisted with the matching payee and amount.
 */
export async function verifyAccountActivity(
  page: Page,
  fromAccountId: string,
  expectedPayee: string,
  expectedAmount: number,
  timeoutMs: number = 10000,
): Promise<ActivityVerification> {
  // Navigate directly to the account activity page for the debiting account
  await page.goto(`activity.htm?id=${encodeURIComponent(fromAccountId)}`);
  await page.waitForLoadState('domcontentloaded');

  const table = page.locator('#transactionTable');
  try {
    await table.waitFor({ state: 'visible', timeout: timeoutMs });
  } catch (err) {
    return {
      verified: false,
      error: `Transaction table (#transactionTable) was not displayed within ${timeoutMs}ms for account ${fromAccountId}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    };
  }

  const rows = page.locator('#transactionTable tbody tr');
  // The rows are filled by an XHR after the table is already visible.
  await rows
    .first()
    .waitFor({ state: 'attached', timeout: timeoutMs })
    .catch(() => {});
  const count = await rows.count();

  if (count === 0) {
    return {
      verified: false,
      error: `No transaction records found in account activity table for account ${fromAccountId}`,
    };
  }

  const expectedAmountFormatted = expectedAmount.toFixed(2);
  const expectedPayeeLower = expectedPayee.trim().toLowerCase();

  // Search each row in the transaction table
  for (let i = 0; i < count; i++) {
    const row = rows.nth(i);
    const dateText = (await row.locator('td').nth(0).textContent())?.trim() ?? '';
    const descText = (await row.locator('td').nth(1).textContent())?.trim() ?? '';
    const debitText = (await row.locator('td').nth(2).textContent())?.trim() ?? '';

    const cleanDebit = debitText.replace(/[$,]/g, '').trim();
    const descLower = descText.toLowerCase();

    // In ParaBank, billpay transactions show as "Funds Transfer Sent" or "Bill Payment to <Payee>"
    const payeeMatches = descLower.includes(expectedPayeeLower);

    const amountMatches =
      cleanDebit === expectedAmountFormatted ||
      Math.abs(parseFloat(cleanDebit || '0') - expectedAmount) < 0.01;

    if (payeeMatches && amountMatches) {
      return {
        verified: true,
        matchedTransaction: {
          date: dateText,
          description: descText,
          amount: debitText,
        },
      };
    }
  }

  return {
    verified: false,
    error: `Transaction not found in activity table for account ${fromAccountId}. Expected Payee: "${expectedPayee}", Expected Amount: $${expectedAmountFormatted}`,
  };
}
