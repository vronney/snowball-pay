/**
 * Loose numeric parsing for calculator inputs.
 *
 * Real people type money the way they say it: "$14,200", "14200", "24.99" — and
 * outside the US, "24,99". A `type="number"` field rejects most of these and the
 * old `parseFloat` path silently mangled them ("14,200" → 14, "$14200" → NaN),
 * which dropped the debt without telling the user. The calculator now takes
 * plain text and normalises here so those inputs all parse.
 *
 * Crucially this VALIDATES structure rather than scrubbing stray characters: a
 * typo like "1O00", "12-3", or "1.2.3" returns `null` (so the caller shows a
 * format hint) instead of being silently rewritten into 100 / 12 / 1.2 and then
 * driving the payoff math and persisted debt data. Only currency marks and
 * whitespace are stripped; everything else must already be a well-formed number.
 */
export function parseNumericInput(raw: string): number | null {
  if (typeof raw !== 'string') return null;

  // Strip only explicitly-supported adornments: currency symbols, the percent
  // sign (people type APRs as "24.99%"), and whitespace.
  const stripped = raw.trim().replace(/[$£€%\s]/g, '');

  // Optional leading sign, then digits and separators only — nothing else.
  const match = /^([+-]?)([0-9.,]+)$/.exec(stripped);
  if (!match) return null;

  const sign = match[1] === '-' ? -1 : 1;
  const body = match[2];

  const lastComma = body.lastIndexOf(',');
  const lastDot = body.lastIndexOf('.');

  let decimalSep: ',' | '.' | null = null;
  let thousandsSep: ',' | '.' | null = null;

  if (lastComma !== -1 && lastDot !== -1) {
    // Both present: the later separator is the decimal mark, the other groups
    // thousands. Covers "1,234.56" (US) and "1.234,56" (EU) alike.
    decimalSep = lastComma > lastDot ? ',' : '.';
    thousandsSep = decimalSep === ',' ? '.' : ',';
  } else if (lastComma !== -1) {
    // Only commas. A single comma with 1–2 trailing digits reads as a decimal
    // ("24,99"); otherwise commas group thousands ("14,200", "1,234,567").
    const trailing = body.length - lastComma - 1;
    const single = body.indexOf(',') === lastComma;
    if (single && trailing > 0 && trailing < 3) {
      decimalSep = ',';
    } else {
      thousandsSep = ',';
    }
  } else if (lastDot !== -1) {
    // Only dots. A single dot is a decimal mark; multiple dots are ambiguous
    // ("1.2.3") and rejected rather than guessed.
    if (body.indexOf('.') !== lastDot) return null;
    decimalSep = '.';
  }

  let intPart = body;
  let fracPart = '';
  if (decimalSep) {
    const idx = body.lastIndexOf(decimalSep);
    intPart = body.slice(0, idx);
    fracPart = body.slice(idx + 1);
    // Fraction is everything after the last separator, so it can only be digits;
    // an empty fraction ("5.") is treated as a whole number.
    if (fracPart !== '' && !/^[0-9]+$/.test(fracPart)) return null;
    // A bare separator (".", "+.", "-.") has no digits at all — reject it
    // rather than normalising the empty int part into a spurious 0.
    if (intPart === '' && fracPart === '') return null;
  }

  if (intPart === '') intPart = '0'; // leading-separator form (".5")

  if (thousandsSep) {
    // Validate the grouping: 1–3 digits, then exact 3-digit groups.
    const groups = intPart.split(thousandsSep);
    if (groups.length < 2) return null;
    if (!/^[0-9]{1,3}$/.test(groups[0])) return null;
    if (groups.slice(1).some((g) => !/^[0-9]{3}$/.test(g))) return null;
    intPart = groups.join('');
  } else if (!/^[0-9]+$/.test(intPart)) {
    return null;
  }

  const value = sign * Number.parseFloat(`${intPart}.${fracPart || '0'}`);
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
