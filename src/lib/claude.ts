import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/** Removes a leading/trailing markdown code fence the model may wrap JSON in. */
function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

/** Slices out the outermost {...} or [...] block, dropping surrounding prose. */
function extractJsonBlock(raw: string): string {
  const firstObjStart = raw.indexOf('{');
  const lastObjEnd = raw.lastIndexOf('}');
  if (firstObjStart !== -1 && lastObjEnd !== -1 && lastObjEnd > firstObjStart) {
    return raw.slice(firstObjStart, lastObjEnd + 1);
  }

  const firstArrStart = raw.indexOf('[');
  const lastArrEnd = raw.lastIndexOf(']');
  if (firstArrStart !== -1 && lastArrEnd !== -1 && lastArrEnd > firstArrStart) {
    return raw.slice(firstArrStart, lastArrEnd + 1);
  }

  return raw.trim();
}

/** Best-effort repair of near-JSON: smart quotes, comments, unquoted keys, trailing commas. */
function repairLikelyJson(raw: string): string {
  return raw
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_-]*)(\s*:)/g, '$1"$2"$3')
    .replace(/'([^'\\]*(?:\\.[^'\\]*)*)'/g, (_m, inner: string) => {
      const escaped = inner.replace(/"/g, '\\"');
      return `"${escaped}"`;
    })
    .replace(/,\s*([}\]])/g, '$1')
    .trim();
}

/**
 * Parses a model text response into JSON, tolerating fences, prose, and
 * near-JSON syntax. Returns null (never throws) when unrecoverable; the
 * failure log is deliberately content-free — see the catch below.
 */
export function parseClaudeJson(raw: string): unknown | null {
  const cleaned = stripCodeFences(raw);
  const extracted = extractJsonBlock(cleaned);

  try {
    return JSON.parse(extracted);
  } catch {
    const repaired = repairLikelyJson(extracted);
    try {
      return JSON.parse(repaired);
    } catch (error) {
      // Content-free by design: `extracted` is raw model output that can embed
      // user financial data (debt names, dollar amounts) on routes like
      // /api/coach-brief, so no preview — and no error.message either, since
      // JSON.parse SyntaxErrors quote a snippet of the input. Shape signals
      // only; routes add their own content-free context (e.g. stop_reason).
      console.warn('Failed to parse Claude JSON response', {
        error: error instanceof Error ? error.name : 'Error',
        length: extracted.length,
        hasBraces: extracted.includes('{') && extracted.includes('}'),
        hadCodeFence: raw.includes('```'),
      });
      return null;
    }
  }
}

/** Joins all text blocks of an Anthropic message into one trimmed string. */
export function extractTextBlocks(content: Anthropic.Messages.Message['content']): string {
  return content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}
