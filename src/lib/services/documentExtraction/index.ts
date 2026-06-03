/**
 * documentExtraction — service layer barrel export
 *
 * Capability blocks:
 *   parsePdf / parsePdfFile      — extract raw text from PDF
 *   extractDebt                  — regex debt field extraction
 *   extractIncome                — regex income field extraction
 *   extractTransactions          — parse transaction lines from statement text
 *   detectRecurring              — algorithmic recurring charge detection
 */

export { parsePdf, parsePdfFile } from './pdfParser';
export type { PdfParseResult } from './pdfParser';

export { extractDebt } from './debtExtractor';
export type { DebtExtractResult, ExtractedDebtItem, DebtCategory } from './debtExtractor';

export { extractIncome } from './incomeExtractor';
export type { IncomeExtractResult, ExtractedIncomeItem, IncomeFrequency, IncomeSource } from './incomeExtractor';

export { extractTransactions } from './transactionExtractor';
export type { TransactionExtractResult, RawTransaction } from './transactionExtractor';

export { detectRecurring } from './recurringDetector';
export type { RecurringDetectResult, RecurringCharge, ExpenseCategory, RecurringFrequency } from './recurringDetector';
