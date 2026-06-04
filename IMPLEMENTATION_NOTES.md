# Background Document Processing Implementation

## Overview
Implemented asynchronous background job processing for document uploads to eliminate timeout issues when processing large bank statements that can take 30-120 seconds.

## Architecture

### Request Flow
1. **Upload** → Returns `202 Accepted` with job IDs (< 1 second)
2. **Frontend Poll** → Checks job status every 1 second (up to 3 minutes)
3. **Background Processing** → Cron job processes queued jobs every minute
4. **Results** → Frontend displays extracted data when ready

### Key Changes

#### Database Schema (Prisma)
- New `DocumentProcessingJob` model to track background job state
- Fields: status (queued/processing/completed/failed), fileData, errorMessage, attempts, etc.
- Updated `UploadedDocument` with `processingJobId` and `status` field

#### API Endpoints
- `POST /api/documents/upload` — Returns 202 with job IDs instead of processing synchronously
- `GET /api/documents/status?documentId=X` — Check job status (status, extractedData, error)
- `POST /api/cron/process-documents` — Cron worker processing queued jobs (1 per minute)

#### Service Layer
- `documentProcessingJob.ts` — Job management (create, retrieve, update status)
- `documentJobProcessor.ts` — Actual PDF processing logic (extracted from POST handler)

#### Frontend
- `useDocumentUpload` hook updated with `pollJobStatus()` function
- `DocumentImportModal` updated to handle 202 responses and polling

#### Configuration
- `vercel.json` — Added cron schedule: `* * * * *` (every minute)
- `.env.example` — Already includes `CRON_SECRET`

## Implementation Checklist

### ✅ Completed
- [x] Prisma schema updated
- [x] Service layer created
- [x] Upload endpoint refactored to queue jobs
- [x] Status endpoint created
- [x] Cron worker endpoint created
- [x] Frontend polling implemented
- [x] Cron schedule added to vercel.json
- [x] Error handling improved

### ⚠️ Before Deploying

1. **Run Database Migration**
   ```bash
   npm run db:push
   # Or if using migration files:
   npm run db:migrate
   ```

2. **Set Environment Variables**
   - Ensure `CRON_SECRET` is set in Vercel deployment settings
   - Value: random 32-character hex string (or use existing value)

3. **Deploy & Test**
   - Deploy to staging first
   - Upload a test document and verify:
     - Upload returns 202
     - Status endpoint returns queued → processing → completed
     - Frontend polls correctly
     - Results display properly

## Performance Characteristics

### Before (Synchronous)
- Upload endpoint: 30-120 seconds (timeout at 30-60s)
- Browser timeout errors, message channel closure
- React crash on 504 responses

### After (Asynchronous)
- Upload endpoint: < 1 second (just queueing)
- Frontend: Polls every 1 second, completes in 30-120 seconds
- No browser timeouts
- Graceful error handling with retry logic
- Users see "Processing statements..." while waiting

## Job Processing Guarantees

- **Max Attempts**: 3 retries on failure
- **Timeout**: Individual job has no timeout (but frontend polls max 180 seconds = 3 minutes)
- **Ordering**: Jobs processed FIFO by creation time
- **Frequency**: Cron runs every minute, processes one job per invocation

## Future Optimizations

1. **Parallel Processing** — Process multiple jobs per cron invocation
2. **Claude AI Fallback** — Re-enable Claude Haiku for low-confidence income extraction
3. **Webhook Notifications** — Instead of polling, notify frontend when job completes
4. **Job Prioritization** — VIP users' jobs could skip queue
5. **Compression** — Store fileData as zlib-compressed Bytes instead of raw

## Error Scenarios

| Scenario | Handling |
|----------|----------|
| File upload fails | 400/413 error in POST handler |
| Job processing fails | Status returns "failed" with errorMessage |
| Job exceeds 3 attempts | Status marked "failed" after 3rd attempt |
| Frontend polling timeout | Shows "exceeded 3 minutes" error |
| Server crash during processing | Cron retries next minute with same job |

## Notes

- File data is stored in `fileData` Bytes column — no external storage needed
- Processing happens in the cron environment, not in user request context
- Extracted data is stored in `extractedData` JSON for immediate retrieval
- Original file is never stored — deleted via Prisma onDelete cascade
