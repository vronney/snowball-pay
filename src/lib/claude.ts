import Anthropic from '@anthropic-ai/sdk';

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();
}

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
      console.warn('Failed to parse Claude JSON response', {
        error: error instanceof Error ? error.message : String(error),
        preview: extracted.slice(0, 300),
      });
      return null;
    }
  }
}

export function extractTextBlocks(content: Anthropic.Messages.Message['content']): string {
  return content
    .map((block) => (block.type === 'text' ? block.text : ''))
    .filter(Boolean)
    .join('\n')
    .trim();
}
