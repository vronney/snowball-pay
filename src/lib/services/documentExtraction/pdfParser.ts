/**
 * pdfParser -- service layer capability block
 *
 * Uses Node.js built-ins only (zlib). Works on machine-generated PDFs
 * (bank/credit card statements, payroll) which use uncompressed or
 * FlateDecode content streams. No third-party PDF library required.
 */

import { inflateSync } from 'zlib';

export interface PdfParseResult {
  text: string;
  hasTextLayer: boolean;
  pageCount: number;
  avgCharsPerPage: number;
}

const MIN_CHARS_PER_PAGE = 80;

function hexDecode(hex: string): string {
  const clean = hex.replace(/\s/g, '');
  let result = '';
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (!isNaN(byte)) result += String.fromCharCode(byte);
  }
  return result;
}

function extractTextFromStream(chunk: string): string {
  const parts: string[] = [];
  let m: RegExpExecArray | null;

  // TJ array: [(text1)(text2)-120(text3)] TJ
  const tjArrayRe = /\[((?:[^\[\]]*(?:\([^)]*\)|<[^>]*>)[^\[\]]*)*)\]\s*TJ/g;
  while ((m = tjArrayRe.exec(chunk)) !== null) {
    const inner = m[1];
    const litRe = /\(([^)]*)\)|<([0-9a-fA-F\s]+)>/g;
    let lm: RegExpExecArray | null;
    while ((lm = litRe.exec(inner)) !== null) {
      if (lm[1] !== undefined) parts.push(lm[1]);
      else if (lm[2] !== undefined) parts.push(hexDecode(lm[2]));
    }
    parts.push(' ');
  }

  // Simple Tj: (text) Tj or <hex> Tj
  const tjRe = /(?:\(([^)]*)\)|<([0-9a-fA-F\s]+)>)\s*['"]?\s*Tj/g;
  while ((m = tjRe.exec(chunk)) !== null) {
    if (m[1] !== undefined) parts.push(m[1]);
    else if (m[2] !== undefined) parts.push(hexDecode(m[2]));
    parts.push(' ');
  }

  return parts.join('').replace(/\\n/g, '\n').replace(/\\r/g, '\n').trim();
}

function countPages(buf: Buffer): number {
  const src = buf.toString('latin1');
  const matches = src.match(/\/Type\s*\/Page[^s]/g);
  return matches ? matches.length : 1;
}

export async function parsePdf(buffer: Buffer): Promise<PdfParseResult> {
  try {
    const src = buffer.toString('latin1');
    const pageCount = countPages(buffer);
    const textParts: string[] = [];

    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m: RegExpExecArray | null;

    while ((m = streamRe.exec(src)) !== null) {
      const raw = Buffer.from(m[1], 'latin1');
      let chunk: string;
      try {
        const inflated = inflateSync(raw);
        chunk = inflated.toString('utf8');
      } catch {
        chunk = m[1];
      }
      const extracted = extractTextFromStream(chunk);
      if (extracted.length > 0) textParts.push(extracted);
    }

    const text = textParts.join('\n').replace(/\s{3,}/g, ' ').trim();
    const avgCharsPerPage = pageCount > 0 ? text.length / pageCount : 0;
    const hasTextLayer = avgCharsPerPage >= MIN_CHARS_PER_PAGE;

    return { text, hasTextLayer, pageCount, avgCharsPerPage };
  } catch {
    return { text: '', hasTextLayer: false, pageCount: 0, avgCharsPerPage: 0 };
  }
}

export async function parsePdfFile(file: File): Promise<PdfParseResult> {
  const buf = Buffer.from(await file.arrayBuffer());
  return parsePdf(buf);
}
