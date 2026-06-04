import { useMutation } from '@tanstack/react-query';
import axios from 'axios';

export type DocumentFileType = 'debt' | 'income' | 'statement';

export interface UploadDocumentArgs {
  file: File;
  fileType: DocumentFileType;
}

export interface UploadDocumentResult {
  extractedData: unknown;
}

export function useDocumentUpload() {
  return useMutation({
    mutationFn: async ({ file, fileType }: UploadDocumentArgs): Promise<UploadDocumentResult> => {
      const form = new FormData();
      form.append('file', file);
      form.append('fileType', fileType);

      // Set timeout to 6 minutes (360s) to allow PDF processing to complete
      // Bank statements with transaction extraction can take 30-120s
      const { data } = await axios.post('/api/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 360000, // 6 minutes in milliseconds
      });
      return data as UploadDocumentResult;
    },
  });
}
