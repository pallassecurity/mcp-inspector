import { MethodExposer, PallasTool } from "./index.js";
import { CSVLoader } from "./lib/csv.js";

interface ITestCaseManagerConfig {
    csvLoader?: CSVLoader;
    dataSource?: string;
}

interface TestParameters {
    [key: string]: unknown;
}

interface TestConfig {
    [key: string]: unknown;
}

interface TestResults {
    success: boolean;
    data?: unknown;
    error?: string;
}

class TestCaseManager implements MethodExposer {
    static readonly exposesMethods = ['createTestCase', 'executeTest', 'validateResults', 'loadTestParameters', 'getTestCases'] as const;
    
    readonly exposesMethods = TestCaseManager.exposesMethods;
    private testCases: Map<string, PallasTool> | undefined;
    private csvLoader: CSVLoader;
    private dataSource: string;

    constructor(config: ITestCaseManagerConfig = {}) {
        if (!config.csvLoader) throw Error("no config");
        if (!config.dataSource) throw Error("no datasource");
        
        this.csvLoader = config.csvLoader;
        this.dataSource = config.dataSource;
    }

    async loadTestParameters(): Promise<void> {
        try {
            const us = await this.csvLoader.loadCSV(this.dataSource);
            console.log(us);
            console.log(this._generateMap(us));
            this.testCases = this._generateMap(us);
        } catch (error) {
            console.error('Failed to load test parameters:', error);
            throw error;
        }
    }

    getTestCases(): Map<string, PallasTool> | undefined {
        return this.testCases;
    }

    createTestCase(name: string, config: TestConfig): void {
        console.log(`Creating test case: ${name}`, config);
    }

    executeTest(testId: string): Promise<boolean> {
        console.log(`Executing test: ${testId}`);
        return Promise.resolve(true);
    }

    validateResults(results: TestResults[]): boolean {
        console.log('Validating test results', results);
        return results.length > 0;
    }

    private _generateMap(toolCalls: TestParameters[]): Map<string, PallasTool> {
        const map = new Map();
        for (const toolCall of toolCalls) {
            const tool = PallasTool.fromNotionCSV(toolCall as Record<string, string>);
            map.set(tool.name, tool);
        }
        return map;
    }

    setDataSource(source: string): void {
        this.dataSource = source;
    }

    setCSVLoader(loader: CSVLoader): void {
        this.csvLoader = loader;
    }
}

export { TestCaseManager };
export type { ITestCaseManagerConfig, TestParameters, TestConfig, TestResults };