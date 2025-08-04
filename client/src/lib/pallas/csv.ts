interface CSVLoader {
    loadCSV(source: string): Promise<TestCaseRow[]>;
}

interface TestCaseRow {
    server: string;
    tool: string;
    request_args: string;
    [key: string]: string | number | boolean;
}

class BrowserCSVLoader implements CSVLoader {
    private csvData: TestCaseRow[] | null = null;

    async loadFromFile(file: File): Promise<TestCaseRow[]> {
        const csvText = await file.text();
        this.csvData = this.parseCSVText(csvText);
        return this.csvData;
    }

    async loadCSV(): Promise<TestCaseRow[]> {
        if (!this.csvData) {
            throw new Error('No CSV file uploaded. Use loadFromFile() first.');
        }
        return this.csvData;
    }

    private parseCSVText(csvText: string): TestCaseRow[] {
        const lines = csvText.trim().split('\n');
        if (lines.length === 0) return [];

        const headers = this.parseCSVLine(lines[0]).map(h => h.trim());
        return this.parseDataLines(lines.slice(1), headers);
    }

    private parseDataLines(lines: string[], headers: string[]): TestCaseRow[] {
        const rows: TestCaseRow[] = [];
        
        for (const line of lines) {
            const values = this.parseCSVLine(line);
            const row = this.createRowFromValues(headers, values);
            rows.push(row);
        }
        
        return rows;
    }

    private createRowFromValues(headers: string[], values: string[]): TestCaseRow {
        const row: Record<string, string> = {};
        
        headers.forEach((header, index) => {
            row[header] = values[index] ?? '';
        });
        
        return row as TestCaseRow;
    }

    private parseCSVLine(line: string): string[] {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (this.isEscapedQuote(char, nextChar, inQuotes)) {
                current += '"';
                i++;
            } else if (char === '"') {
                inQuotes = !inQuotes;
            } else if (this.isFieldSeparator(char, inQuotes)) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        result.push(current);
        return result;
    }

    private isEscapedQuote(char: string, nextChar: string | undefined, inQuotes: boolean): boolean {
        return char === '"' && inQuotes && nextChar === '"';
    }

    private isFieldSeparator(char: string, inQuotes: boolean): boolean {
        return char === ',' && !inQuotes;
    }
}

export type { CSVLoader, TestCaseRow as ITestCaseRow };
export { BrowserCSVLoader };