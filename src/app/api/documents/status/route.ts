import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAuth, unauthorized } from '@/lib/auth-server';

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
    const doc = await prisma.uploadedDocument.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        status: true,
        extractedData: true,
        errorMessage: true,
        updatedAt: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: doc.id,
      status: doc.status,
      extractedData: doc.extractedData,
      errorMessage: doc.errorMessage,
      processedAt: doc.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 },
    );
  }
}
