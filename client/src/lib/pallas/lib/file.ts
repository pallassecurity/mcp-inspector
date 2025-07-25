//
// This file has been generated and has not been reviewed
//
//
import { promises as fs } from 'fs';
import * as path from 'path';
import { createReadStream } from 'fs';
import { createInterface } from 'readline';

interface FileReaderOptions {
  encoding?: BufferEncoding;
  flag?: string;
  signal?: AbortSignal;
}

interface StreamReaderOptions {
  highWaterMark?: number;
  encoding?: BufferEncoding;
}

interface LineReaderOptions {
  encoding?: BufferEncoding;
  crlfDelay?: number;
}

class FileReader {
  private defaultOptions: Required<Omit<FileReaderOptions, 'signal'>> & { signal?: AbortSignal };

  constructor(options: FileReaderOptions = {}) {
    this.defaultOptions = {
      encoding: options.encoding || 'utf8',
      flag: options.flag || 'r',
      signal: options.signal
    };
  }

  /**
   * Read entire file as string
   */
  async readText(filePath: string, options?: FileReaderOptions): Promise<string> {
    try {
      const opts = { ...this.defaultOptions, ...options };
      const content = await fs.readFile(filePath, opts);
      return content.toString();
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Read file as buffer
   */
  async readBuffer(filePath: string, options?: Omit<FileReaderOptions, 'encoding'>): Promise<Buffer> {
    try {
      const opts = { ...options, flag: options?.flag || this.defaultOptions.flag };
      return await fs.readFile(filePath, opts);
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Read JSON file and parse
   */
  async readJSON<T = any>(filePath: string, options?: FileReaderOptions): Promise<T> {
    try {
      const content = await this.readText(filePath, options);
      return JSON.parse(content);
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON in file ${filePath}: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Read file line by line (memory efficient for large files)
   */
  async *readLines(filePath: string, options?: LineReaderOptions): AsyncGenerator<string, void, unknown> {
    const opts = {
      encoding: options?.encoding || this.defaultOptions.encoding,
      crlfDelay: options?.crlfDelay || Infinity
    };

    const fileStream = createReadStream(filePath, { encoding: opts.encoding });
    const rl = createInterface({
      input: fileStream,
      crlfDelay: opts.crlfDelay
    });

    try {
      for await (const line of rl) {
        yield line;
      }
    } finally {
      rl.close();
      fileStream.destroy();
    }
  }

  /**
   * Read file as stream
   */
  createReadStream(filePath: string, options?: StreamReaderOptions) {
    const opts = {
      encoding: options?.encoding || this.defaultOptions.encoding,
      highWaterMark: options?.highWaterMark || 64 * 1024 // 64KB default
    };

    return createReadStream(filePath, opts);
  }

  /**
   * Read multiple files concurrently
   */
  async readMultiple(filePaths: string[], options?: FileReaderOptions): Promise<{ [filePath: string]: string }> {
    const results: { [filePath: string]: string } = {};
    
    const promises = filePaths.map(async (filePath) => {
      try {
        const content = await this.readText(filePath, options);
        results[filePath] = content;
      } catch (error) {
        results[filePath] = `Error: ${(error as Error).message}`;
      }
    });

    await Promise.all(promises);
    return results;
  }

  /**
   * Read file with retry logic
   */
  async readWithRetry(
    filePath: string, 
    maxRetries: number = 3, 
    retryDelay: number = 1000,
    options?: FileReaderOptions
  ): Promise<string> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await this.readText(filePath, options);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          throw new Error(`Failed to read file ${filePath} after ${maxRetries} attempts: ${lastError.message}`);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, retryDelay * attempt));
      }
    }

    throw lastError!;
  }

  /**
   * Check if file exists and is readable
   */
  async canRead(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get file information
   */
  async getFileInfo(filePath: string) {
    try {
      const stats = await fs.stat(filePath);
      const parsed = path.parse(filePath);
      
      return {
        path: filePath,
        name: parsed.name,
        extension: parsed.ext,
        directory: parsed.dir,
        size: stats.size,
        sizeFormatted: this.formatFileSize(stats.size),
        created: stats.birthtime,
        modified: stats.mtime,
        accessed: stats.atime,
        isFile: stats.isFile(),
        isDirectory: stats.isDirectory(),
        permissions: {
          readable: true, // We already checked access
          writable: await this.canWrite(filePath),
          executable: await this.canExecute(filePath)
        }
      };
    } catch (error) {
      throw new Error(`Failed to get file info for ${filePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Read file chunk by chunk (for very large files)
   */
  async *readChunks(
    filePath: string, 
    chunkSize: number = 64 * 1024,
    options?: StreamReaderOptions
  ): AsyncGenerator<Buffer, void, unknown> {
    const stream = createReadStream(filePath, {
      highWaterMark: chunkSize,
      encoding: undefined // Read as buffer
    });

    try {
      for await (const chunk of stream) {
        yield chunk as Buffer;
      }
    } finally {
      stream.destroy();
    }
  }

  private async canWrite(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.W_OK);
      return true;
    } catch {
      return false;
    }
  }

  private async canExecute(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }

  private formatFileSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }
}

// Utility functions for common file operations
export class FileUtils {
  /**
   * Read directory contents
   */
  static async readDirectory(dirPath: string, recursive: boolean = false): Promise<string[]> {
    const files: string[] = [];
    
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      
      if (item.isFile()) {
        files.push(fullPath);
      } else if (item.isDirectory() && recursive) {
        const subFiles = await FileUtils.readDirectory(fullPath, true);
        files.push(...subFiles);
      }
    }
    
    return files;
  }

  /**
   * Find files by extension
   */
  static async findFilesByExtension(dirPath: string, extensions: string[]): Promise<string[]> {
    const allFiles = await FileUtils.readDirectory(dirPath, true);
    const normalizedExts = extensions.map(ext => ext.toLowerCase().startsWith('.') ? ext : `.${ext}`);
    
    return allFiles.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return normalizedExts.includes(ext);
    });
  }

  /**
   * Get file size
   */
  static async getFileSize(filePath: string): Promise<number> {
    const stats = await fs.stat(filePath);
    return stats.size;
  }
}

export { FileReader, FileReaderOptions, StreamReaderOptions, LineReaderOptions };

