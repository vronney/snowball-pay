import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

export type DocumentFileType = 'debt' | 'income' | 'statement';

export interface UploadDocumentArgs {
  file: File;
  fileType: DocumentFileType;
}

export interface UploadDocumentResult {
  jobs?: Array<{ documentId: string; jobId: string }>;
  extractedData?: unknown;
}

export interface JobStatusResponse {
  id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  extractedData?: unknown;
  errorMessage?: string;
  processedAt?: string;
}

export function useDocumentUpload() {
  return useMutation({
    mutationFn: async ({ file, fileType }: UploadDocumentArgs): Promise<UploadDocumentResult> => {
      const form = new FormData();
      form.append('file', file);
      form.append('fileType', fileType);

      // Job queueing returns immediately (202), then we poll for results
      const { status, data } = await axios.post('/api/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000, // 30 seconds (quick upload to queue)
      });

      // Return job info for polling
      if (status === 202) {
        return data as UploadDocumentResult;
      }

      // Fallback for backward compatibility
      return data as UploadDocumentResult;
    },
  });
}

export async function pollJobStatus(documentId: string, maxAttempts = 180): Promise<JobStatusResponse> {
  const pollInterval = 1000; // 1 second
  let attempts = 0;

  while (attempts < maxAttempts) {
    try {
      const { data } = await axios.get(`/api/documents/status?documentId=${documentId}`);
      const status = data as JobStatusResponse;

      if (status.status === 'completed' || status.status === 'failed') {
        return status;
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    } catch (error) {
      console.error('Error polling job status:', error);
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      attempts++;
    }
  }

  throw new Error('Job processing timeout: exceeded maximum polling attempts');
}
