/**
 * dataCleanup — normalize and standardize extracted financial data
 *
 * Handles the "real-world PDF" problem: extracted data is often
 * inconsistent, malformed, or non-standard. This layer cleans before
 * the data enters the budget pipeline.
 */

export interface CleanedTransaction {
  date: string; // ISO 8601: YYYY-MM-DD
  merchant: string; // Title case, cleaned
  amount: number; // Positive number
  category?: string;
  confidence: 'high' | 'medium' | 'low';
}

export function parseDate(raw: string): string | null {
  // Try MM/DD/YYYY or MM/DD/YY
  let match = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (match) {
    const [, m, d, y] = match;
    const year = y ? (y.length === 2 ? `20${y}` : y) : new Date().getFullYear().toString();
    return `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try Jan 15, 2024 or January 15
  match = raw.match(/([A-Za-z]{3,})\s+(\d{1,2})(?:\s+(\d{4}))?/);
  if (match) {
    const months: Record<string, string> = {
      jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
      jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
    };
    const monthKey = match[1].toLowerCase().slice(0, 3);
    const month = months[monthKey];
    if (month) {
      const year = match[3] || new Date().getFullYear().toString();
      return `${year}-${month}-${match[2].padStart(2, '0')}`;
    }
  }

  return null;
}

export function cleanMerchant(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    // Remove phone numbers
    .replace(/\d{3}[-.]?\d{3}[-.]?\d{4}/g, '')
    // Remove store/reference numbers
    .replace(/#\d+/g, '')
    .replace(/\*\S+/g, '')
    // Normalize whitespace
    .replace(/\s{2,}/g, ' ')
    .trim()
    // Title case
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function parseAmount(raw: string | number): number | null {
  const cleaned = String(raw)
    .replace(/[$€£¥]/g, '')
    .replace(/[(),]/g, '')
    .trim();

  const amount = parseFloat(cleaned);
  if (isNaN(amount) || amount === 0) return null;

  return Math.abs(amount);
}

export function cleanTransaction(
  date: string,
  merchant: string,
  amount: string | number,
): CleanedTransaction | null {
  const cleanDate = parseDate(date);
  const cleanMerch = cleanMerchant(merchant);
  const cleanAmount = parseAmount(amount);

  if (!cleanDate || !cleanMerch || cleanAmount === null) {
    return null;
  }

  // Confidence scoring
  let confidence: 'high' | 'medium' | 'low' = 'high';
  if (cleanMerch.length < 3) confidence = 'low'; // Too short to be meaningful
  if (cleanAmount > 100000) confidence = 'low'; // Suspiciously large
  if (cleanAmount < 0.01) confidence = 'low'; // Too small

  return {
    date: cleanDate,
    merchant: cleanMerch,
    amount: cleanAmount,
    confidence,
  };
}

export function deduplicateTransactions(
  transactions: CleanedTransaction[],
): CleanedTransaction[] {
  const seen = new Set<string>();

  return transactions.filter((t) => {
    const key = `${t.date}|${t.merchant}|${t.amount}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function sortTransactionsByDate(transactions: CleanedTransaction[]): CleanedTransaction[] {
  return [...transactions].sort((a, b) => a.date.localeCompare(b.date));
}
