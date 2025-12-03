import express from 'express';
import path from 'path';
import { db, ReportRequest } from './db';
import { reportQueue } from './queue';
import { storage } from './storage';
import config from './config';

const app = express();
app.use(express.json());

// Serve static files from public directory
const publicPath = path.join(process.cwd(), 'public');
app.use(express.static(publicPath));

// Serve the UI at root path
app.get('/', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

/**
 * GET /reports
 * List all reports
 */
app.get('/reports', async (req, res) => {
  try {
    const reports = await db.getAllReports();
    
    const cleanReports = reports.map((report: ReportRequest) => ({
      id: report.id,
      status: report.status,
      progress: report.progress,
      progress_message: report.progress_message,
      error_message: report.error_message,
      created_at: report.created_at,
      updated_at: report.updated_at,
      file_path: report.file_path ? true : false // Don't expose actual path
    }));
    
    res.json(cleanReports);
  } catch (error) {
    console.error('Error listing reports:', error);
    res.status(500).json({ error: 'Failed to list reports' });
  }
});

/**
 * POST /reports
 * Create a new report request
 */
app.post('/reports', async (req, res) => {
  try {
    const report = await db.createReport();

    await reportQueue.add('generate-report', {
      reportId: report.id,
      email: config.email.user
    });

    console.log(`[API] Report ${report.id} queued as PENDING`);

    res.status(202).json({
      id: report.id,
      status: report.status,
      message: 'Report generation started'
    });
  } catch (error) {
    console.error('Error creating report:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({ error: 'Failed to create report', details: errorMessage });
  }
});

/**
 * GET /reports/:id/download
 * Download report PDF
 */
app.get('/reports/:id/download', async (req, res) => {
  try {
    const { id } = req.params;

    const report = await db.getReport(id);
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'READY') {
      return res.status(400).json({ 
        error: 'Report not ready',
        status: report.status 
      });
    }

    if (!report.file_path) {
      return res.status(500).json({ error: 'Report file not found' });
    }

    const pdfBuffer = await storage.readPdf(report.file_path);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="report-${id}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading report:', error);
    res.status(500).json({ error: 'Failed to download report' });
  }
});

/**
 * DELETE /reports/:id
 * Cancel a pending report
 */
app.delete('/reports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await db.getReport(id);
    
    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    if (report.status !== 'PENDING') {
      return res.status(400).json({ 
        error: 'Can only cancel pending reports',
        status: report.status 
      });
    }

    const jobs = await reportQueue.getJobs(['waiting', 'delayed']);
    const job = jobs.find(j => j.data.reportId === id);
    
    if (job) {
      await job.remove();
      console.log(`[API] Removed job ${job.id} from queue for report ${id}`);
    } else {
      console.log(`[API] Job not found in queue for report ${id} (may have already started)`);
    }

    await db.updateStatus(id, 'CANCELLED', undefined, 'Cancelled by user');
    
    console.log(`[API] Report ${id} cancelled`);

    res.json({ 
      message: 'Report cancelled successfully',
      id
    });
  } catch (error) {
    console.error('Error cancelling report:', error);
    res.status(500).json({ error: 'Failed to cancel report' });
  }
});

app.listen(config.app.port, () => {
  console.log(`API server running on port ${config.app.port}`);
});
