import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { limits } from '@/lib/rateLimit';

// Allow up to 5 minutes — two-pass analysis across many files takes time
export const maxDuration = 300;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Prompts ───────────────────────────────────────────────────────────────────

const DEBT_PROMPT = `You are a financial data extraction assistant. Analyze this document and extract all debt accounts.

Return ONLY valid JSON — no markdown, no explanation:
{
  "type": "debt",
  "items": [
    {
      "name": "string (account name or lender name)",
      "category": "one of: Credit Card | Student Loan | Auto Loan | Mortgage | Personal Loan | Medical Debt | Other",
      "balance": number (current balance owed),
      "interestRate": number (APR as a percentage, e.g. 19.99),
      "minimumPayment": number (minimum monthly payment, 0 if not found),
      "creditLimit": number (credit limit for credit cards, 0 if not applicable),
      "dueDate": number or null (day of month payment is due, 1-31)
    }
  ]
}
If you cannot find a field use 0 or null. If this is not a debt document return { "type": "debt", "items": [] }.`;

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

// Pass 1 — fast per-file extraction using Haiku
const EXTRACT_TRANSACTIONS_PROMPT = `Extract all debit/purchase transactions from this bank or credit card statement.

Return ONLY valid JSON — no markdown:
{
  "period": "string (e.g. January 2024, or filename if period not visible)",
  "transactions": [
    {
      "merchant": "string (clean merchant name, e.g. 'Netflix' not 'NETFLIX.COM 866-579')",
      "amount": number (transaction amount, positive number),
      "occurrences": number (how many times this exact merchant appears in this statement)
    }
  ]
}

Rules:
- Merge duplicate merchants: if Netflix appears 3 times at $15.99, output one entry with occurrences: 3
- EXCLUDE: transfers between own accounts, ATM withdrawals, incoming deposits, loan/credit card payments, refunds
- Clean merchant names: strip reference numbers, phone numbers, location codes
- Only include debit/outgoing charges`;

// Pass 2 — smart reconciliation using Opus (text only, fast)
const RECONCILE_PROMPT = `You are a financial analyst. Given transaction data extracted from multiple bank/credit card statements, identify ONLY genuinely recurring charges.

STRICT RULES:
- A charge is recurring ONLY if: it appears in 2+ statements at similar amounts, OR it is an obvious fixed monthly bill (rent, known subscription, insurance)
- DO NOT include one-time purchases, irregular spending, or charges appearing in only one statement (unless clearly a fixed bill)
- DO NOT include debt minimum payments — those are tracked separately
- For grocery/fuel, only include if the same merchant appears consistently across multiple statements

Classify isEssential = true for: housing, utilities, insurance, food/groceries, transport/fuel, medical
Classify isEssential = false for: streaming, subscriptions, gym, entertainment, dining out

Normalize all amounts to monthly:
- Annual ÷ 12, weekly × 4.33, bi-weekly × 2.167

Return ONLY valid JSON — no markdown:
{
  "type": "statement",
  "recurringCharges": [
    {
      "name": "string (clean merchant/service name)",
      "amount": number (typical per-occurrence amount),
      "frequency": "monthly | bi-weekly | weekly | annual",
      "monthlyAmount": number (normalized monthly equivalent),
      "category": "housing | utilities | insurance | food | transport | medical | subscriptions | entertainment | other",
      "isEssential": boolean,
      "occurrences": number (total times seen across ALL statements),
      "confidence": "high | medium | low"
    }
  ],
  "totalMonthlyEssential": number,
  "totalMonthlyAll": number,
  "analysisNotes": "string (brief: X statements analysed, date range, key findings)"
}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

type SupportedMediaType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' | 'application/pdf';

function getMediaType(fileName: string): SupportedMediaType {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'pdf')  return 'application/pdf';
  if (ext === 'png')  return 'image/png';
  if (ext === 'gif')  return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return 'image/jpeg';
}

function fileToContentBlock(base64: string, mediaType: SupportedMediaType) {
  return mediaType === 'application/pdf'
    ? { type: 'document' as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } }
    : { type: 'image'    as const, source: { type: 'base64' as const, media_type: mediaType, data: base64 } };
}

function parseClaudeJson(raw: string): any {
  const clean = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '').trim();
  return JSON.parse(clean);
}

// ── Security helpers ──────────────────────────────────────────────────────────

const ALLOWED_FILE_TYPES = new Set(['debt', 'income', 'statement']);
const MAX_FILES            = 20;
const MAX_FILE_SIZE_BYTES  = 10 * 1024 * 1024;  // 10 MB per file
const MAX_TOTAL_SIZE_BYTES = 90 * 1024 * 1024;  // 90 MB total

/** Strip path-traversal sequences and unsafe characters from user-supplied names. */
function sanitizeFileName(name: string): string {
  return name
    .replace(/\.\./g, '')                 // no path traversal
    .replace(/[^a-zA-Z0-9.\-_ ]/g, '_')  // allow only safe chars
    .slice(0, 255);
}

/**
 * Verify the first bytes of a file match the expected magic signature for its
 * declared extension.  Rejects polyglot / renamed files before they reach the
 * AI model or the database.
 */
async function validateFileMagicBytes(file: File): Promise<boolean> {
  const buf = await file.slice(0, 12).arrayBuffer();
  const b   = new Uint8Array(buf);
  const ext = file.name.toLowerCase().split('.').pop();

  switch (ext) {
    case 'pdf':
      // %PDF
      return b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
    case 'jpg':
    case 'jpeg':
      // SOI marker
      return b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF;
    case 'png':
      // PNG signature
      return b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47;
    case 'gif':
      // GIF87a or GIF89a
      return b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38 &&
             (b[4] === 0x37 || b[4] === 0x39) && b[5] === 0x61;
    case 'webp':
      // RIFF....WEBP
      return b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
             b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50;
    default:
      return false;
  }
}

// ── Two-pass statement analysis ───────────────────────────────────────────────

async function extractTransactionsFromFile(file: File): Promise<{ period: string; transactions: any[] }> {
  try {
    const buf       = await file.arrayBuffer();
    const base64    = Buffer.from(buf).toString('base64');
    const mediaType = getMediaType(file.name);
    const block     = fileToContentBlock(base64, mediaType);

    const msg = await client.messages.create({
      model: 'claude-haiku-4-5-20251001', // Fast model for per-file pass
      max_tokens: 2048,
      messages: [{
        role: 'user',
        content: [block, { type: 'text', text: EXTRACT_TRANSACTIONS_PROMPT }],
      }],
    });

    const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
    return parseClaudeJson(raw);
  } catch (err) {
    console.error(`Transaction extraction failed for ${file.name}:`, err);
    return { period: file.name, transactions: [] };
  }
}

async function reconcileRecurringCharges(
  extractionResults: { period: string; transactions: any[] }[],
  fileCount: number,
): Promise<any> {
  const summary = JSON.stringify(extractionResults, null, 2);
  const prompt  = `${RECONCILE_PROMPT}

Transaction data from ${fileCount} statements:
${summary}`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 4096,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }] }],
  });

  const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
  return parseClaudeJson(raw);
}

// ── Route handlers ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  if (!limits.documentUpload(auth.user.id)) {
    return NextResponse.json(
      { error: 'Too many uploads. Please wait before uploading more documents.' },
      { status: 429 }
    );
  }

  try {
    const formData = await request.formData();
    const fileTypeRaw = formData.get('fileType');
    const fileType = typeof fileTypeRaw === 'string' ? fileTypeRaw : null;

    const rawFiles   = formData.getAll('files').filter((f): f is File => f instanceof File);
    const singleFile = formData.get('file');
    const files      = rawFiles.length > 0 ? rawFiles : singleFile instanceof File ? [singleFile] : [];

    if (files.length === 0 || !fileType) {
      return NextResponse.json({ error: 'At least one file and fileType are required' }, { status: 400 });
    }

    // ── Security validation ───────────────────────────────────────────────────
    if (!ALLOWED_FILE_TYPES.has(fileType)) {
      return NextResponse.json({ error: 'Invalid fileType' }, { status: 400 });
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Too many files. Maximum is ${MAX_FILES} per request.` },
        { status: 400 },
      );
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

      const validMagic = await validateFileMagicBytes(file);
      if (!validMagic) {
        return NextResponse.json(
          { error: `File "${sanitizeFileName(file.name)}" is not a valid PDF or image.` },
          { status: 400 },
        );
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    let extractedData: any;

    if (fileType === 'statement') {
      // ── Two-pass: parallel per-file extraction → text-only reconciliation ──
      // Pass 1: run all files in parallel with Haiku (fast, small per-call)
      const extractionResults = await Promise.all(
        files.map((file) => extractTransactionsFromFile(file))
      );

      // Pass 2: send only the extracted text to Opus for smart reconciliation
      extractedData = await reconcileRecurringCharges(extractionResults, files.length);

    } else {
      // Debt / Income: single file, single Claude call (unchanged behaviour)
      const file      = files[0];
      const buf       = await file.arrayBuffer();
      const base64    = Buffer.from(buf).toString('base64');
      const mediaType = getMediaType(file.name);
      const block     = fileToContentBlock(base64, mediaType);
      const prompt    = fileType === 'income' ? INCOME_PROMPT : DEBT_PROMPT;

      const msg = await client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 2048,
        messages: [{ role: 'user', content: [block, { type: 'text', text: prompt }] }],
      });

      const raw = msg.content[0].type === 'text' ? msg.content[0].text : '';
      extractedData = { type: fileType, items: [] };
      try { extractedData = parseClaudeJson(raw); } catch { console.error('Parse error:', raw); }
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
            extractedData,
            status:        'completed',
          },
        })
      )
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
      where: { userId: auth.user.id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ documents });
  } catch (error) {
    console.error('Error fetching documents:', error);
    return serverError('Failed to fetch documents');
  }
}
