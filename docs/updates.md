# Dreamint Updates & Potential Improvements

## Gemini Batch Mode for Cost Savings

### Overview

Google's Gemini API offers a **Batch Mode** that provides **50% cost savings** compared to standard synchronous API calls. This document explores the feasibility of adding Batch Mode support to Dreamint.

### Current Implementation

Dreamint currently uses the **synchronous `generateContent` endpoint**:

```
https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent
```

Located in: `app/lib/generate-seedream.ts` (lines 328-353)

**Characteristics:**
- Real-time response (seconds to ~3-4 minutes depending on load/region)
- Standard pricing (~$0.03/image for Gemini API direct)
- Immediate feedback for interactive experimentation
- Each image request is a separate API call

### Batch Mode Alternative

**Endpoint:** Batch API uses `batchGenerateContent` with job submission/polling pattern

**Pricing:** 50% discount (~$0.015/image vs ~$0.03/image)

**Turnaround:** Target is 24 hours, but often completes in minutes to hours

### How Batch Mode Works

Unlike synchronous requests, Batch Mode follows an asynchronous job pattern:

1. **Prepare Requests**
   - Create a JSONL file containing all generation requests
   - Each line is a separate request with prompt, config, etc.
   - Maximum file size: 2GB

2. **Submit Batch Job**
   ```
   POST https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:batchGenerateContent
   ```
   - Upload JSONL inline or reference from Google Cloud Storage
   - Receive a batch job ID

3. **Poll for Completion**
   - Check job status periodically
   - Status progresses: PENDING → RUNNING → SUCCEEDED/FAILED

4. **Retrieve Results**
   - Download output JSONL containing generated images (base64)
   - Parse and display results

### Implementation Requirements

To add Batch Mode to Dreamint, the following changes would be needed:

#### 1. UI Changes

- Add "Batch Mode" toggle in Settings panel
- New "Batch Queue" view to show pending/completed batch jobs
- Status indicators for batch job progress
- Notification system for when batches complete

#### 2. New Components

```
app/
├── _components/
│   └── create-page/
│       ├── batch-queue.tsx       # View pending/completed batches
│       ├── batch-status.tsx      # Job status indicator
│       └── batch-settings.tsx    # Batch mode configuration
├── lib/
│   ├── generate-seedream.ts      # Modify to support batch submission
│   ├── batch-api.ts              # New: Batch job management
│   └── batch-storage.ts          # New: IndexedDB for batch job tracking
```

#### 3. Core Logic Changes

**batch-api.ts (new file):**
```typescript
// Submit batch job
async function submitBatchJob(requests: BatchRequest[]): Promise<string> {
  // Convert requests to JSONL format
  // Submit to Batch API
  // Return job ID
}

// Check batch status
async function getBatchStatus(jobId: string): Promise<BatchStatus> {
  // Poll batch job status
  // Return current state and progress
}

// Retrieve batch results
async function getBatchResults(jobId: string): Promise<BatchResult[]> {
  // Fetch completed results
  // Parse JSONL output
  // Return generated images
}
```

**generate-seedream.ts modifications:**
```typescript
export async function generateSeedream({
  // ... existing params
  useBatchMode?: boolean,  // New parameter
}: GenerateSeedreamArgs): Promise<SeedreamGeneration | BatchJobReference> {

  if (useBatchMode && provider === "gemini") {
    // Queue request for batch processing
    // Return job reference instead of immediate results
  }

  // ... existing synchronous logic
}
```

#### 4. Storage Changes

New IndexedDB store for batch jobs:
```typescript
interface BatchJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  submittedAt: string;
  completedAt?: string;
  requests: BatchRequest[];
  results?: SeedreamGeneration[];
  error?: string;
}
```

#### 5. Background Polling

- Service worker or periodic polling to check batch status
- Update UI when jobs complete
- Handle page close/reload (jobs persist server-side)

### UX Implications

**Current Flow (Synchronous):**
1. User enters prompt → clicks Generate
2. Loading spinner shows elapsed time
3. Images appear in seconds/minutes
4. Immediate iteration and experimentation

**Batch Mode Flow:**
1. User enters prompt → clicks "Add to Batch"
2. Requests queue locally
3. User clicks "Submit Batch" (or auto-submit on threshold)
4. "Batch submitted" confirmation with job ID
5. User can close browser and return later
6. Poll/notification when complete
7. Results appear in Batch Queue view

### Trade-offs

| Aspect | Synchronous (Current) | Batch Mode |
|--------|----------------------|------------|
| **Cost** | ~$0.03/image | ~$0.015/image (50% off) |
| **Speed** | Seconds to minutes | Minutes to hours (up to 24h) |
| **UX** | Interactive, immediate | Delayed, async |
| **Use Case** | Experimentation, iteration | Bulk generation, cost-sensitive |
| **Complexity** | Simple request/response | Job management, polling, storage |

### Recommendation

**For Dreamint's current design philosophy (quick experimentation), Batch Mode may not be ideal as the primary mode.** However, it could be valuable as an **optional feature** for users who:

- Need to generate many images and aren't time-sensitive
- Want to minimize API costs
- Are running overnight/bulk generation jobs

**Suggested Implementation Approach:**

1. Keep synchronous mode as default
2. Add "Batch Mode" as an opt-in setting
3. When enabled, show a "batch queue" panel
4. Allow users to queue multiple prompts
5. Submit as batch when ready
6. Background poll and notify on completion

### References

- [Gemini Batch API Documentation](https://ai.google.dev/gemini-api/docs/batch-api)
- [Batch Mode Announcement - Google Developers Blog](https://developers.googleblog.com/en/scale-your-ai-workloads-batch-mode-gemini-api/)
- [Gemini API Pricing](https://ai.google.dev/gemini-api/docs/pricing)

### Cost Comparison Example

Generating 100 images:

| Mode | Cost per Image | Total Cost |
|------|---------------|------------|
| Synchronous | $0.03 | $3.00 |
| Batch Mode | $0.015 | $1.50 |
| **Savings** | | **$1.50 (50%)** |

For high-volume users, the savings add up significantly over time.
