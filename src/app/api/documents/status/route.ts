import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth, unauthorized } from '@/lib/auth-server';
import { getJobStatus } from '@/lib/services/documentProcessingJob';

export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.valid || !auth.user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const documentId = searchParams.get('documentId');

  if (!documentId) {
    return NextResponse.json(
      { error: 'documentId is required' },
      { status: 400 },
    );
  }

  try {
    const status = await getJobStatus(documentId);

    if (!status) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: status.id,
      status: status.status,
      extractedData: status.extractedData,
      errorMessage: status.errorMessage,
      processedAt: status.processedAt,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
