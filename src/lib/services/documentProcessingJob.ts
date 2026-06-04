import { prisma } from '@/lib/prisma';

export interface DocumentProcessingJobInput {
  userId: string;
  documentId: string;
  fileName: string;
  fileType: 'debt' | 'income' | 'statement';
  fileData: Buffer | Uint8Array;
}

export async function createProcessingJob(input: DocumentProcessingJobInput) {
  return prisma.documentProcessingJob.create({
    data: {
      documentId: input.documentId,
      userId: input.userId,
      fileName: input.fileName,
      fileType: input.fileType,
      fileData: Buffer.from(input.fileData),
      status: 'queued',
    },
  });
}

export async function getProcessingJob(jobId: string) {
  return prisma.documentProcessingJob.findUnique({
    where: { id: jobId },
  });
}

export async function getJobStatus(documentId: string) {
  return prisma.documentProcessingJob.findUnique({
    where: { documentId },
    select: {
      id: true,
      status: true,
      extractedData: true,
      errorMessage: true,
      processedAt: true,
    },
  });
}

export async function getNextPendingJob() {
  return prisma.documentProcessingJob.findFirst({
    where: {
      status: 'queued',
      attempts: { lt: 3 },
    },
    orderBy: { createdAt: 'asc' },
  });
}

export async function markJobAsProcessing(jobId: string) {
  return prisma.documentProcessingJob.update({
    where: { id: jobId },
    data: { status: 'processing', attempts: { increment: 1 } },
  });
}

export async function markJobAsCompleted(jobId: string, extractedData: unknown) {
  return prisma.documentProcessingJob.update({
    where: { id: jobId },
    data: {
      status: 'completed',
      extractedData: extractedData as object,
      processedAt: new Date(),
    },
  });
}

export async function markJobAsFailed(jobId: string, errorMessage: string) {
  return prisma.documentProcessingJob.update({
    where: { id: jobId },
    data: {
      status: 'failed',
      errorMessage,
    },
  });
}

export async function updateUploadedDocumentJob(documentId: string, jobId: string) {
  return prisma.uploadedDocument.update({
    where: { id: documentId },
    data: { processingJobId: jobId, status: 'processing' },
  });
}
