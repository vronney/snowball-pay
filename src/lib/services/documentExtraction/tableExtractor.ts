import Anthropic from '@anthropic-ai/sdk';

/**
 * tableExtractor — Claude-powered structured table extraction
 *
 * Uses Claude vision to detect and extract tables from PDFs,
 * handling complex layouts that regex cannot parse.
 * Fallback when simple regex extraction has low confidence.
 */

export interface ExtractedTable {
  columns: string[];
  rows: Record<string, string>[];
}

const TABLE_EXTRACTION_PROMPT = `You are a financial document table extraction assistant.
Analyze this bank or credit card statement and extract ALL transaction tables.

Return ONLY valid JSON with this structure:
{
  "tables": [
    {
      "columns": ["Date", "Description", "Amount", ...],
      "rows": [
        {"Date": "01/15/2024", "Description": "MERCHANT NAME", "Amount": "100.00", ...},
        ...
      ]
    }
  ]
}

Rules:
- Extract every transaction row exactly as shown
- Preserve column headers
- Return empty tables array if no transactions found
- Do NOT include header/footer info, only transaction data
- For "Amount" columns, include the sign (negative for debits)
- Standardize dates to MM/DD/YYYY format if possible`;

export async function extractTablesWithClaude(
  base64Pdf: string,
  fileName: string,
): Promise<ExtractedTable[]> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  try {
    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64Pdf,
              },
            },
            {
              type: 'text',
              text: TABLE_EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = msg.content[0].type === 'text' ? msg.content[0].text : '';
    const cleaned = rawText.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    return parsed.tables || [];
  } catch (error) {
    console.error('Error extracting tables with Claude:', error);
    return [];
  }
}

export function convertTableToTransactions(
  table: ExtractedTable,
): Array<{ date: string; merchant: string; amount: number }> {
  const dateCol = table.columns.findIndex(
    (c) => c.toLowerCase().includes('date') || c.toLowerCase().includes('posted'),
  );
  const descCol = table.columns.findIndex(
    (c) =>
      c.toLowerCase().includes('description') ||
      c.toLowerCase().includes('merchant') ||
      c.toLowerCase().includes('transaction'),
  );
  const amountCol = table.columns.findIndex(
    (c) => c.toLowerCase().includes('amount') || c.toLowerCase().includes('debit'),
  );

  if (dateCol === -1 || descCol === -1 || amountCol === -1) {
    return [];
  }

  return table.rows
    .map((row) => {
      const dateStr = Object.values(row)[dateCol];
      const merchantStr = Object.values(row)[descCol];
      const amountStr = String(Object.values(row)[amountCol]).replace(/[$,]/g, '');
      const amount = parseFloat(amountStr);

      if (!dateStr || !merchantStr || !amount) return null;

      return {
        date: dateStr,
        merchant: merchantStr.trim(),
        amount: Math.abs(amount),
      };
    })
    .filter((t) => t !== null) as Array<{ date: string; merchant: string; amount: number }>;
}
