import { Pool } from 'pg';
import config from './config';

const pool = new Pool(config.database);

export interface ReportRequest {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'READY' | 'FAILED' | 'CANCELLED';
  progress: number;
  progress_message: string | null;
  file_path: string | null;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
}

export const db = {
  async createReport(): Promise<ReportRequest> {
    const result = await pool.query<ReportRequest>(
      `INSERT INTO report_requests (status)
       VALUES ('PENDING')
       RETURNING *`
    );
    return result.rows[0];
  },

  async getReport(id: string): Promise<ReportRequest | null> {
    const result = await pool.query<ReportRequest>(
      'SELECT * FROM report_requests WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async getAllReports(): Promise<ReportRequest[]> {
    const result = await pool.query<ReportRequest>(
      'SELECT * FROM report_requests ORDER BY created_at DESC'
    );
    return result.rows;
  },

  async updateStatus(
    id: string,
    status: 'PENDING' | 'RUNNING' | 'READY' | 'FAILED' | 'CANCELLED',
    filePath?: string,
    errorMessage?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE report_requests 
       SET status = $1, file_path = $2, error_message = $3, updated_at = NOW()
       WHERE id = $4`,
      [status, filePath || null, errorMessage || null, id]
    );
  },

  async updateProgress(
    id: string,
    progress: number,
    progressMessage?: string
  ): Promise<void> {
    await pool.query(
      `UPDATE report_requests 
       SET progress = $1, progress_message = $2, updated_at = NOW()
       WHERE id = $3`,
      [progress, progressMessage || null, id]
    );
  }
};
