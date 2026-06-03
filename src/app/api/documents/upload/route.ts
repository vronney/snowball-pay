import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import {
  parsePdfFile,
  extractDebt,
  extractIncome,
  extractTransactions,
  detectRecurring,
} from '@/lib/services/documentExtraction';

// Allow up to 5 minutes for multi-file statement analysis
export const maxDuration = 300;

// ── Security constants ────────────────────────────────────────────────────────

const ALLOWED_FILE_TYPES = new Set(['debt', 'income', 'statement']);
const MAX_FILES            = 20;
const MAX_FILE_SIZE_BYTES  = 10 * 1024 * 1024;  // 10 MB per file
const MAX_TOTAL_SIZE_BYTES = 90 * 1024 * 1024;  // 90 MB total

function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[^a-zA-Z0-9.\-_ ]/g, '_')
    .slice(0, 255);
}

async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buf = await file.slice(0, 12).arrayBuffer();
  const b   = new Uint8Array(buf);
  const ext = file.name.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    case 'jpg':
    case 'jpeg':
      return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    case 'png':
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    case 'gif':
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
             (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61;
    case 'webp':
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
             b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    default:
      return false;
  }
}

// ── Claude fallback (income only, low-confidence code extraction) ─────────────

const INCOME_PROMPT = `You are a financial data extraction assistant. Analyze this document and extract income information.

Return ONLY valid JSON — no markdown, no explanation:
{
  "type": "income",
  "items": [
    {
      "monthlyTakeHome": number (net monthly take-home pay),
      "source": "string (e.g. W2, 1099, Self-Employed)",
      "frequency": "one of: monthly | bi-weekly | weekly"
    }
  ]
}
If pay is bi-weekly multiply by 2.167 to get monthly. If this is not an income document return { "type": "income", "items": [] }.`;

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';

function getMediaType(fileName: string): SupportedMediaType {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf')  return 'application/pdf';
  if (ext === 'png')  return 'image/png';
  if (ext === 'gif')  return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function parseClaudeJson(raw: string): unknown {
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
}

async function extractIncomeWithClaude(file: File): Promise<unknown> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const buf       = await file.arrayBuffer();
  const base64    = Buffer.from(buf).toString('base64');
  const mediaType = getMediaType(file.name);

  const contentBlock = mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } }
    : { type: 'image'    as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } };

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: [contentBlock, { type: 'text', text: INCOME_PROMPT }] }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return parseClaudeJson(raw);
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  if (!(await isPro(auth.user.id))) {
    return upgradeRequired('Document import');
  }

  if (!(await limits.documentUpload(auth.user.id))) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait before uploading more documents.' },
      { status: 429 },
    );
  }

  try {
    const formData    = await request.formData();
    const fileTypeRaw = formData.get('fileType');
    const fileType    = typeof fileTypeRaw === 'string' ? fileTypeRaw : null;
    const rawFiles    = formData.getAll('files').filter((f): f is File => f instanceof File);
    const singleFile  = formData.get('file');
    const files       = rawFiles.length > 0 ? rawFiles : singleFile instanceof File ? [singleFile] : [];

    if (files.length === 0 || !fileType) {
      return NextResponse.json({ error: 'At least one file and fileType are required' }, { status: 400 });
    }

    // ── Security validation ───────────────────────────────────────────────────

    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      return NextResponse.json({ error: 'Invalid fileType' }, { status: 400 });
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json({ error: `Too many files. Maximum is ${MAX_FILES} per request.` }, { status: 400 });
    }
    const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_TOTAL_SIZE_BYTES) {
      return NextResponse.json({ error: 'Total file size exceeds 90 MB.' }, { status: 400 });
    }
    for (const file of files) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        return NextResponse.json(
          { error: `File "${sanitizeFileName(file.name)}" exceeds the 10 MB per-file limit.` },
          { status: 400 },
        );
      }
      if (!(await validateFileMagicBytes(file))) {
        return NextResponse.json(
          { error: `File "${sanitizeFileName(file.name)}" is not a valid PDF or image.` },
          { status: 400 },
        );
      }
    }

    // ── Extraction — orchestration layer routes by fileType ───────────────────
    //
    // Debt statements  → pdf-parse + regex (no AI)
    // Bank statements  → pdf-parse + transaction extract + recurring detect (no AI)
    // Income docs      → pdf-parse + regex; Claude Haiku fallback if low confidence

    let extractedData: unknown;

    if (fileType === 'statement') {
      const extractions = await Promise.all(
        files.map(async (file) => {
          const parsed = await parsePdfFile(file);
          return extractTransactions(parsed.text, file.name);
        }),
      );
      extractedData = detectRecurring(extractions);

    } else if (fileType === 'debt') {
      const file   = files[0];
      const parsed = await parsePdfFile(file);
      extractedData = extractDebt(parsed.text, sanitizeFileName(file.name));

    } else {
      // income
      const file   = files[0];
      const parsed = await parsePdfFile(file);
      const result = extractIncome(parsed.text);

      if (result.confident) {
        extractedData = result;
      } else {
        // Pay stub formats are too variable for reliable regex — use Claude Haiku
        // (cheapest model, vision-capable) as a targeted fallback only here
        try {
          extractedData = await extractIncomeWithClaude(file);
        } catch (err) {
          console.error('Claude income fallback failed:', err);
          extractedData = result; // return low-confidence result rather than hard error
        }
      }
    }

    // Persist document records
    await Promise.all(
      files.map((file) =>
        prisma.uploadedDocument.create({
          data: {
            userId:        auth.user!.id,
            fileName:      sanitizeFileName(file.name),
            fileType,
            fileUrl:       '',
            extractedData: extractedData as object,
            status:        'completed',
          },
        }),
      ),
    );

    return NextResponse.json({ extractedData }, { status: 200 });
  } catch (error) {
    console.error('Error processing document(s):', error);
    return serverError('Failed to process document(s)');
  }
}

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  try {
    const documents = await prisma.uploadedDocument.findMany({
      where:   { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return serverError('Failed to fetch documents');
  }
}
