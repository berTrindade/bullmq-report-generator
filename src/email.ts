import nodemailer from 'nodemailer';
import config from './config';

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false, // true for 465, false for other ports
  auth: {
    user: config.email.user,
    pass: config.email.pass
  },
  tls: {
    rejectUnauthorized: false
  }
});

export const email = {
  async sendReportReady(to: string, reportId: string): Promise<void> {
    const downloadUrl = `${config.app.baseUrl}/reports/${reportId}/download`;
    
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject: 'Your report is ready',
      html: `
        <h2>Your report is ready for download</h2>
        <p>Click the link below to download your report:</p>
        <a href="${downloadUrl}">Download Report</a>
        <p>If you did not request this report, please ignore this email.</p>
      `
    });
  }
};
