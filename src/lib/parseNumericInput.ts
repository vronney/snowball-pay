/**
 * Loose numeric parsing for calculator inputs.
 *
 * Real people type money the way they say it: "$14,200", "14200", "24.99" — and
 * outside the US, "24,99". A `type="number"` field rejects most of these and the
 * old `parseFloat` path silently mangled them ("14,200" → 14, "$14200" → NaN),
 * which dropped the debt without telling the user. The calculator now takes
 * plain text and normalises here so those inputs all parse, and returns `null`
 * for genuine garbage so callers can show a format hint instead of a blank.
 */
export function parseNumericInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;

  // Keep only digits, separators, and a leading sign.
  const cleaned = raw.trim().replace(/[^0-9.,-]/g, '');
  if (!/[0-9]/.test(cleaned)) return null;

  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');
  let normalised = cleaned;

  if (hasComma && hasDot) {
    // Whichever separator appears last is the decimal mark; the other groups
    // thousands. Covers "1,234.56" (US) and "1.234,56" (EU) alike.
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalised = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      normalised = cleaned.replace(/,/g, '');
    }
  } else if (hasComma) {
    const groups = cleaned.split(',');
    const last = groups[groups.length - 1];
    // A single comma with 1–2 trailing digits reads as a decimal ("24,99");
    // 3-digit groups ("14,200") or repeated commas read as thousands.
    normalised =
      groups.length === 2 && last.length < 3
        ? cleaned.replace(',', '.')
        : cleaned.replace(/,/g, '');
  }

  const value = Number.parseFloat(normalised);
  return Number.isFinite(value) ? value : null;
}

export type DebtFieldKey = 'balance' | 'rate' | 'minimum';

const FORMAT_HINTS: Record<DebtFieldKey, string> = {
  balance: 'Enter an amount like 14,200',
  rate: 'Enter a rate like 24.99',
  minimum: 'Enter an amount like 285',
};

/**
 * Inline validation for a single debt field. Returns a short hint to show under
 * the input, or `null` when the value is acceptable.
 *
 * Empty optional fields (rate, minimum) stay quiet. An empty balance only errors
 * once the row has been started, so a blank card never nags — but a half-filled
 * card that can't produce a result tells the user exactly why.
 */
export function debtFieldError(
  field: DebtFieldKey,
  value: string,
  opts?: { rowStarted?: boolean },
): string | null {
  const trimmed = value.trim();

  if (trimmed === '') {
    if (field === 'balance' && opts?.rowStarted) {
      return 'Add a balance to include this debt';
    }
    return null;
  }

  const parsed = parseNumericInput(trimmed);
  if (parsed === null || parsed < 0) return FORMAT_HINTS[field];
  if (field === 'balance' && parsed <= 0) return FORMAT_HINTS[field];
  return null;
}
