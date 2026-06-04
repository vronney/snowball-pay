import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { processDocumentJob } from '@/lib/services/documentJobProcessor';

// Called by Vercel cron to process queued document jobs
// Uses CRON_SECRET from environment for authorization

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    // Get next document with status='processing' and attempts < 3
    const doc = await prisma.uploadedDocument.findFirst({
      where: {
        status: 'processing',
        attempts: { lt: 3 },
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!doc) {
      return NextResponse.json({
        message: 'No documents to process',
        processed: 0,
      });
    }

    try {
      // Process the document
      const extractedData = await processDocumentJob(
        doc.fileUrl,
        doc.fileType as 'debt' | 'income' | 'statement',
        doc.fileName,
      );

      // Mark as completed
      await prisma.uploadedDocument.update({
        where: { id: doc.id },
        data: {
          status: 'completed',
          extractedData: extractedData as any,
          errorMessage: null,
        },
      });

      return NextResponse.json({
        message: 'Document processed successfully',
        documentId: doc.id,
        status: 'completed',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing document ${doc.id}:`, error);

      // Increment attempts and mark as failed if max retries reached
      const newAttempts = doc.attempts + 1;
      const status = newAttempts >= 3 ? 'failed' : 'processing';

      await prisma.uploadedDocument.update({
        where: { id: doc.id },
        data: {
          status,
          attempts: newAttempts,
          errorMessage,
        },
      });

      return NextResponse.json({
        error: 'Document processing failed',
        documentId: doc.id,
        attempts: newAttempts,
        errorMessage,
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in document processing cron:', error);
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 },
    );
  }
}
