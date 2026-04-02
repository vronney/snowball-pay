export interface EmailContentItem {
  type: string;   // tip | article | advice
  title: string;
  body: string;
}

/**
 * Fetches tips/articles from a publicly published Google Sheet CSV.
 * Falls back to built-in content if the sheet is unavailable.
 */
export async function fetchEmailContent(): Promise<EmailContentItem | null> {
  const sheetUrl = process.env.CONTENT_SHEET_URL;
  if (!sheetUrl) return getRandomFallback();

  try {
    const res = await fetch(sheetUrl, { next: { revalidate: 3600 } });
    if (!res.ok) return getRandomFallback();

    const csv = await res.text();
    const rows = parseCSV(csv);

    // Filter active rows (column index 3 = "active")
    const active = rows.filter(
      (r) => r[3]?.trim().toLowerCase() === 'true' && r[1]?.trim() && r[2]?.trim()
    );
    if (!active.length) return getRandomFallback();

    // Pick a random active row
    const row = active[Math.floor(Math.random() * active.length)];
    return { type: row[0]?.trim() || 'tip', title: row[1].trim(), body: row[2].trim() };
  } catch {
    return getRandomFallback();
  }
}

function parseCSV(csv: string): string[][] {
  return csv
    .split('\n')
    .slice(1) // skip header row
    .filter((line) => line.trim())
    .map((line) => {
      // Handle quoted fields with commas inside
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (const char of line) {
        if (char === '"') { inQuotes = !inQuotes; continue; }
        if (char === ',' && !inQuotes) { result.push(current); current = ''; continue; }
        current += char;
      }
      result.push(current);
      return result;
    });
}

const FALLBACK_CONTENT: EmailContentItem[] = [
  {
    type: 'tip',
    title: 'Every Extra Dollar Counts',
    body: 'Putting even $25 extra toward your highest-priority debt each month can shave months off your payoff date and save hundreds in interest. Try rounding up your next payment.',
  },
  {
    type: 'tip',
    title: 'Automate Your Payments',
    body: 'Setting up autopay for at least the minimum on every debt protects your credit score and removes the mental load. Then put your energy into accelerating one debt at a time.',
  },
  {
    type: 'advice',
    title: 'Windfalls Go Straight to Debt',
    body: 'Tax refunds, bonuses, and birthday money are powerful when applied directly to your focus debt. A single $500 lump sum can eliminate months of minimum payments.',
  },
  {
    type: 'tip',
    title: 'Review Your Budget Monthly',
    body: 'A quick 10-minute monthly check-in — comparing actual spending vs. your plan — can reveal extra cash you didn\'t know you had. Log into SnowballPay to update your numbers.',
  },
  {
    type: 'advice',
    title: 'Don\'t Close Paid-Off Cards',
    body: 'Once you pay off a credit card, keep the account open (just don\'t use it). Closing it can hurt your credit utilization ratio and lower your score.',
  },
];

function getRandomFallback(): EmailContentItem {
  return FALLBACK_CONTENT[Math.floor(Math.random() * FALLBACK_CONTENT.length)];
}
