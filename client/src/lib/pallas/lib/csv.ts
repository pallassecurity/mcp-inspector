/**
 * Abstract interface for CSV data loading
 */
interface CSVLoader {
    /**
     * Load CSV data and return parsed rows
     * @param source - The source identifier (file path, import path, etc.)
     * @returns Promise resolving to array of parsed CSV rows
     */
    loadCSV(source: string): Promise<any[]>;
}

/**
 * Interface for test case data row structure
 */
interface ITestCaseRow {
    server: string;
    tool: string;
    request_args: string;
    [key: string]: any; // Allow additional columns
}

/**
 * Bundler-based CSV loader for React/Webpack/Vite environments
 * Uses dynamic imports to load CSV files processed by bundler plugins
 */
class BundlerCSVLoader implements CSVLoader {
    async loadCSV(source: string): Promise<ITestCaseRow[]> {
        try {
            // Dynamic import for bundler-processed CSV files
            // @vite-ignore - Suppress Vite dynamic import analysis warning
            const data = await import(/* @vite-ignore */ source);
            // Handle both default exports and named exports
            const csvData = data.default || data;
            
            if (!Array.isArray(csvData)) {
                throw new Error(`Expected CSV data to be an array, got ${typeof csvData}`);
            }
            
            return csvData;
        } catch (error) {
            throw new Error(`Failed to load CSV from bundler: ${error.message}`);
        }
    }
}

/**
 * Static bundler CSV loader for Vite/Webpack environments
 * Uses a predefined import map to avoid dynamic import issues
 */
class StaticBundlerCSVLoader implements CSVLoader {
    private importMap: Map<string, () => Promise<any>> = new Map();

    /**
     * Register a static import for a CSV file
     * @param source - The source path used as key
     * @param importFn - Function that returns the import promise
     */
    registerImport(source: string, importFn: () => Promise<any>): void {
        this.importMap.set(source, importFn);
    }

    async loadCSV(source: string): Promise<ITestCaseRow[]> {
        const importFn = this.importMap.get(source);

        if (!importFn) {
            throw new Error(`No static import registered for source: ${source}. Use registerImport() first.`);
        }

        try {
            const data = await importFn();
            const csvData = data.default || data;

            if (!Array.isArray(csvData)) {
                throw new Error(`Expected CSV data to be an array, got ${typeof csvData}`);
            }

            return csvData;
        } catch (error) {
            throw new Error(`Failed to load CSV from static bundler import: ${error.message}`);
        }
    }
}


/**
 * File system CSV loader for Node.js/CLI environments
 * Uses Node.js built-in fs module with simple CSV parsing
 */
class FileSystemCSVLoader implements CSVLoader {
    async loadCSV(source: string): Promise<ITestCaseRow[]> {
        // Only import fs when actually needed (Node.js environment)
        const fs = await import('fs');

        try {
            const csvText = await fs.promises.readFile(source, 'utf-8');
            return this.parseCSVText(csvText);
        } catch (error) {
            throw new Error(`Failed to read CSV file: ${error.message}`);
        }
    }

    /**
     * Simple CSV parser that handles basic CSV format
     * Supports quoted fields and escaped quotes
     */
    private parseCSVText(csvText: string): ITestCaseRow[] {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return [];

        // Parse header row
        const headers = this.parseCSVLine(lines[0]);
        const rows: ITestCaseRow[] = [];

        // Parse data rows
        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            rows.push(row);
        }

        return rows;
    }

    /**
     * Parse a single CSV line handling quoted fields
     */
    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                // Escaped quote
                current += '"';
                i++; // Skip next quote
            } else if (char === '"') {
                // Toggle quote state
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                // Field separator
                result.push(current.trim());
                current = '';
            } else {
                // Regular character
                current += char;
            }
        }

        // Add the last field
        result.push(current.trim());

        return result;
    }
}

/**
 * Web-based CSV loader using fetch API
 * Useful for loading CSV files from URLs in browser environments
 */
export class WebCSVLoader implements CSVLoader {
    async loadCSV(source: string): Promise<ITestCaseRow[]> {
        try {
            const response = await fetch(source);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const csvText = await response.text();
            return this.parseCSVText(csvText);
        } catch (error) {
            throw new Error(`Failed to load CSV from web: ${error.message}`);
        }
    }

    /**
     * Simple CSV parser - same as FileSystemCSVLoader
     */
    private parseCSVText(csvText: string): ITestCaseRow[] {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return [];

        const headers = this.parseCSVLine(lines[0]);
        const rows: ITestCaseRow[] = [];

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            const row: any = {};

            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });

            rows.push(row);
        }

        return rows;
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"' && inQuotes && nextChar === '"') {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                result.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current.trim());
        return result;
    }
}


export type { CSVLoader }
export { FileSystemCSVLoader, BundlerCSVLoader, StaticBundlerCSVLoader }
