import { NextRequest, NextResponse } from 'next/server';
import {
  getNextPendingJob,
  markJobAsProcessing,
  markJobAsCompleted,
  markJobAsFailed,
} from '@/lib/services/documentProcessingJob';
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
    const job = await getNextPendingJob();

    if (!job) {
      return NextResponse.json({
        message: 'No pending jobs',
        processed: 0,
      });
    }

    // Mark as processing
    await markJobAsProcessing(job.id);

    try {
      // Process the document
      // Convert Uint8Array to Buffer if needed
      const fileBuffer = Buffer.isBuffer(job.fileData)
        ? job.fileData
        : Buffer.from(job.fileData);

      const extractedData = await processDocumentJob(
        fileBuffer,
        job.fileType as 'debt' | 'income' | 'statement',
        job.fileName,
      );

      // Mark as completed
      await markJobAsCompleted(job.id, extractedData);

      return NextResponse.json({
        message: 'Job processed successfully',
        jobId: job.id,
        status: 'completed',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`Error processing job ${job.id}:`, error);

      // Mark as failed
      await markJobAsFailed(job.id, errorMessage);

      return NextResponse.json({
        error: 'Job processing failed',
        jobId: job.id,
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
