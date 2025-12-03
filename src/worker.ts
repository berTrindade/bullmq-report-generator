import { Job } from 'bullmq';
import { createWorker, ReportJobData } from './queue';
import { db } from './db';
import { storage } from './storage';
import { email } from './email';
import { generatePdf } from './pdf';

async function processReport(job: Job<ReportJobData>): Promise<void> {
  const { reportId, email: userEmail } = job.data;

  console.log(`[Worker] Processing report ${reportId}`);

  try {
    // Check current status to ensure idempotency
    const report = await db.getReport(reportId);
    
    if (!report) {
      throw new Error(`Report ${reportId} not found`);
    }

    // Idempotency: Skip if already completed
    if (report.status === 'READY') {
      console.log(`[Worker] Report ${reportId} already completed, skipping`);
      return;
    }

    // Mark as running - BullMQ handles stall detection automatically
    await db.updateStatus(reportId, 'RUNNING');
    await db.updateProgress(reportId, 10, 'Job started');
    console.log(`[Worker] Job picked up! Status: ${report.status} -> RUNNING`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause to show 10%
    
    // Simulate realistic work phases (demo only - mimics data fetching, processing, etc.)
    console.log(`[Worker] Processing job ${reportId}...`);
    
    // Phase 1: Fetch data from database/API
    console.log(`[Worker] [Phase 1/3] Fetching report data...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await db.updateProgress(reportId, 30, 'Data fetched successfully');
    console.log(`[Worker] Data fetching complete`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause to show 30%
    
    // Phase 2: Process and transform data
    console.log(`[Worker] [Phase 2/3] Processing and transforming data...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    await db.updateProgress(reportId, 50, 'Data processing complete');
    console.log(`[Worker] Data processing complete`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause to show 50%

    // Phase 3: Generate PDF document
    console.log(`[Worker] [Phase 3/3] Rendering PDF document...`);
    await db.updateProgress(reportId, 60, 'Generating PDF');
    console.log(`[Worker] Generating PDF content...`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause to show 60%
    
    const pdfBuffer = await generatePdf({ type: 'demo', format: 'pdf' });
    await db.updateProgress(reportId, 70, 'PDF generated, saving to storage');
    console.log(`[Worker] PDF generated successfully (${pdfBuffer.length} bytes)`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause to show 70%

    // Save to local storage
    const fileName = `${reportId}.pdf`;
    console.log(`[Worker] Saving PDF to local storage: ${fileName}`);
    await storage.savePdf(fileName, pdfBuffer);
    
    await db.updateProgress(reportId, 85, 'Finalizing report');
    console.log(`[Worker] Finalizing report`);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Pause to show 85%

    await db.updateStatus(reportId, 'READY', fileName);
    await db.updateProgress(reportId, 100, 'Report ready');
    console.log(`[Worker] Status updated: RUNNING -> READY`);

    console.log(`[Worker] Sending notification email to ${userEmail}`);
    await email.sendReportReady(userEmail, reportId);
    console.log(`[Worker] Email sent successfully`);

    console.log(`[Worker] Report ${reportId} completed successfully`);
    console.log(`[Worker] ================================================`);
    console.log(`[Worker] WORKFLOW COMPLETE:`);
    console.log(`[Worker]    Queue: Job received from queue`);
    console.log(`[Worker]    Process: PENDING -> RUNNING -> READY`);
    console.log(`[Worker]    PDF: Generated and stored`);
    console.log(`[Worker]    Email: Notification sent`);
    console.log(`[Worker]    Ready: File available for download`);
    console.log(`[Worker] ================================================`);
  } catch (error) {
    console.error(`[Worker] Error processing report ${reportId}:`, error);
    
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      errorMessage = `${error.message}${error.stack ? '\n\nStack trace:\n' + error.stack : ''}`;
    }
    
    await db.updateStatus(reportId, 'FAILED', undefined, errorMessage);
    console.log(`[Worker] Report ${reportId} marked as FAILED: ${errorMessage}`);
    
    throw error; // Re-throw to let BullMQ handle retries
  }
}

// Create and start worker
const worker = createWorker(processReport);

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed (BullMQ status: completed)`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed (BullMQ status: failed): ${err.message}`);
});

worker.on('active', (job) => {
  console.log(`[Worker] Job ${job.id} active (BullMQ status: active)`);
});

worker.on('stalled', (jobId) => {
  console.log(`[Worker] Job ${jobId} stalled (BullMQ detected stall, moving back to waiting)`);
});

worker.on('error', (err) => {
  console.error('[Worker] Worker error:', err);
});

console.log('[Worker] Started and listening for jobs...');

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  process.exit(0);
});
