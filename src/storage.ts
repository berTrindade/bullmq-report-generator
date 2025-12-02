import { promises as fs } from 'fs';
import path from 'path';
import config from './config';

// Ensure storage directory exists
async function ensureStorageDir() {
  try {
    await fs.mkdir(config.storage.directory, { recursive: true });
  } catch (error) {
    // Directory might already exist, ignore
  }
}

export const storage = {
  async savePdf(fileName: string, buffer: Buffer): Promise<string> {
    await ensureStorageDir();
    const filePath = path.join(config.storage.directory, fileName);
    await fs.writeFile(filePath, buffer);
    return fileName; // Return relative path
  },

  async readPdf(fileName: string): Promise<Buffer> {
    const filePath = path.join(config.storage.directory, fileName);
    return await fs.readFile(filePath);
  }
};
