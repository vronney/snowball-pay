import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized, serverError } from '@/lib/auth-server';
import { isPro, upgradeRequired } from '@/lib/gates';
import { limits } from '@/lib/rateLimit';
import { createProcessingJob, updateUploadedDocumentJob } from '@/lib/services/documentProcessingJob';

// Job queueing is fast; no need for long timeout
export const maxDuration = 30;

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

// Note: Claude AI extraction and other processing now happens asynchronously
// in the documentJobProcessor service, called by the job worker cron endpoint.

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

    // ── Queueing — create background jobs instead of processing synchronously
    // Processing moves to cron worker for async execution
    // Return 202 Accepted immediately with job ID(s)

    const jobs = await Promise.all(
      files.map(async (file) => {
        const fileBuffer = Buffer.from(await file.arrayBuffer());
        const sanitizedName = sanitizeFileName(file.name);

        // Create document record
        const doc = await prisma.uploadedDocument.create({
          data: {
            userId: auth.user!.id,
            fileName: sanitizedName,
            fileType,
            fileUrl: '',
            status: 'processing',
          },
        });

        // Create background processing job
        const job = await createProcessingJob({
          userId: auth.user!.id,
          documentId: doc.id,
          fileName: sanitizedName,
          fileType: fileType as 'debt' | 'income' | 'statement',
          fileData: fileBuffer,
        });

        // Link document to job
        await updateUploadedDocumentJob(doc.id, job.id);

        return { documentId: doc.id, jobId: job.id };
      }),
    );

    return NextResponse.json(
      {
        message: 'Document processing queued',
        jobs,
      },
      { status: 202 }, // Accepted — processing in background
    );
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
