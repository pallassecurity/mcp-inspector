//
// This is file has been generated and not review
//
//

interface CSVLoaderOptions {
    delimiter?: string;
    hasHeader?: boolean;
    skipEmptyLines?: boolean;
    trimWhitespace?: boolean;
    encoding?: string;
}

interface CSVData {
    headers?: string[];
    rows: string[][];
    data?: Record<string, string>[];
}

class CSVLoader {
    private options: Required<CSVLoaderOptions>;

    constructor(options: CSVLoaderOptions = {}) {
        this.options = {
            delimiter: options.delimiter || ',',
            hasHeader: options.hasHeader ?? true,
            skipEmptyLines: options.skipEmptyLines ?? true,
            trimWhitespace: options.trimWhitespace ?? true,
            encoding: options.encoding || 'utf-8'
        };
    }

    /**
     * Load CSV from file path (Node.js)
     */
    async loadFromFile(filePath: string): Promise<CSVData> {
        const fs = await import('fs/promises');
        const content = await fs.readFile(filePath, { encoding: this.options.encoding as BufferEncoding });
        return this.parseCSV(content);
    }

    /**
     * Load CSV from File object (Browser)
     */
    async loadFromFileObject(file: File): Promise<CSVData> {
        const content = await file.text();
        return this.parseCSV(content);
    }

    /**
     * Load CSV from string content
     */
    loadFromString(content: string): CSVData {
        return this.parseCSV(content);
    }

    /**
     * Load CSV from URL
     */
    async loadFromURL(url: string): Promise<CSVData> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch CSV: ${response.status} ${response.statusText}`);
        }
        const content = await response.text();
        return this.parseCSV(content);
    }

    private parseCSV(content: string): CSVData {
        const lines = content.split(/\r?\n/);
        const rows: string[][] = [];

        for (const line of lines) {
            if (this.options.skipEmptyLines && line.trim() === '') {
                continue;
            }

            const row = this.parseLine(line);
            rows.push(row);
        }

        if (rows.length === 0) {
            return { rows: [] };
        }

        if (this.options.hasHeader && rows.length > 0) {
            const headers = rows[0];
            const dataRows = rows.slice(1);

            // Convert to objects
            const data = dataRows.map(row => {
                const obj: Record<string, string> = {};
                headers.forEach((header, index) => {
                    obj[header] = row[index] || '';
                });
                return obj;
            });

            return {
                headers,
                rows: dataRows,
                data
            };
        }

        return { rows };
    }

    private parseLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        let i = 0;

        while (i < line.length) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    // Escaped quote
                    current += '"';
                    i += 2;
                } else {
                    // Toggle quote state
                    inQuotes = !inQuotes;
                    i++;
                }
            } else if (char === this.options.delimiter && !inQuotes) {
                // Field separator
                result.push(this.options.trimWhitespace ? current.trim() : current);
                current = '';
                i++;
            } else {
                current += char;
                i++;
            }
        }

        // Add the last field
        result.push(this.options.trimWhitespace ? current.trim() : current);

        return result;
    }

    /**
     * Convert parsed data back to CSV string
     */
    static toCSV(data: CSVData, options: { delimiter?: string; includeHeaders?: boolean } = {}): string {
        const delimiter = options.delimiter || ',';
        const includeHeaders = options.includeHeaders ?? true;

        const lines: string[] = [];

        if (includeHeaders && data.headers) {
            lines.push(data.headers.map(header => CSVLoader.escapeField(header, delimiter)).join(delimiter));
        }

        const rows = data.rows || [];
        for (const row of rows) {
            lines.push(row.map(field => CSVLoader.escapeField(field, delimiter)).join(delimiter));
        }

        return lines.join('\n');
    }

    private static escapeField(field: string, delimiter: string): string {
        // If field contains delimiter, quotes, or newlines, wrap in quotes
        if (field.includes(delimiter) || field.includes('"') || field.includes('\n') || field.includes('\r')) {
            return `"${field.replace(/"/g, '""')}"`;
        }
        return field;
    }
}

// Usage examples:
export type { CSVData, CSVLoaderOptions }
export { CSVLoader };
