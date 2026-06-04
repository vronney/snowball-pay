import {
  extractDebt,
  extractIncome,
  extractTransactions,
  detectRecurring,
  parsePdf,
  extractTablesWithClaude,
  convertTableToTransactions,
  cleanTransaction,
  deduplicateTransactions,
  sortTransactionsByDate,
} from '@/lib/services/documentExtraction';

export async function processDocumentJob(
  fileUrl: string,
  fileType: 'debt' | 'income' | 'statement',
  fileName: string,
): Promise<unknown> {
  // Fetch file from Vercel Blob
  const response = await fetch(fileUrl);
  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // Use parsePdf with the fetched buffer
  const parsed = await parsePdf(fileBuffer);

  if (fileType === 'statement') {
    // Try regex extraction first (fast path for simple statements)
    const regexResult = extractTransactions(parsed.text, fileName);
    const regexCount = regexResult.transactions.length;

    // If regex found transactions with reasonable confidence, use those
    if (regexCount >= 5) {
      return detectRecurring([regexResult]);
    }

    // Otherwise, try Claude table extraction for complex layouts
    console.log(`Regex found ${regexCount} transactions, trying Claude extraction...`);

    try {
      const base64Pdf = fileBuffer.toString('base64');
      const tables = await extractTablesWithClaude(base64Pdf, fileName);

      if (tables.length > 0) {
        // Convert Claude-extracted tables to transactions
        const claudeTransactions = tables
          .flatMap((table) => convertTableToTransactions(table))
          .map((t) => cleanTransaction(t.date, t.merchant, t.amount))
          .filter((t) => t !== null);

        const deduped = deduplicateTransactions(claudeTransactions);
        const sorted = sortTransactionsByDate(deduped);

        if (sorted.length > 0) {
          return {
            type: 'statement',
            transactions: sorted,
            extractionMethod: 'claude-tables',
            source: 'Claude-powered table extraction',
          };
        }
      }
    } catch (error) {
      console.error('Claude table extraction failed:', error);
      // Fall back to regex results
    }

    // Fall back to regex results if Claude extraction failed or found nothing
    return detectRecurring([regexResult]);
  } else if (fileType === 'debt') {
    return extractDebt(parsed.text, fileName);
  } else {
    // income
    const result = extractIncome(parsed.text);

    if (result.confident) {
      return result;
    } else {
      // For low-confidence income, return as-is
      // Could enhance with Claude vision here if needed
      return result;
    }
  }
}
