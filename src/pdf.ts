import PDFDocument from 'pdfkit';

export async function generatePdf(params: Record<string, any>): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument();
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Simple report generation
    doc.fontSize(20).text('Report', { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Generated at: ${new Date().toISOString()}`);
    doc.moveDown();
    doc.text('Parameters:');
    doc.text(JSON.stringify(params, null, 2));
    
    // Add more content based on params...
    doc.moveDown();
    doc.text('This is a sample report with some content.');
    
    doc.end();
  });
}
