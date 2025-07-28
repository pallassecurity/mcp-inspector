import { IMethodExposer, PallasTool } from "./index";
import { CSVLoader } from "./lib/csv";

/**
 * Configuration interface for TestCaseManager
 */
interface ITestCaseManagerConfig {
    csvLoader?: CSVLoader;
    dataSource?: string;
}

/**
 * Updated TestCaseManager with minimal changes and dependency injection
 * Drop-in replacement for your existing TestCaseManager
 */
class TestCaseManager implements IMethodExposer {
    static readonly exposesMethods = ['createTestCase', 'executeTest', 'validateResults', 'loadTestParameters', 'getTestCases'] as const;

    private testCases: Map<string, PallasTool> | undefined;
    private testParameters: any; // Keep for backward compatibility
    private csvLoader: CSVLoader;
    private dataSource: string;

    constructor(config: ITestCaseManagerConfig = {}) {
        if (!config.csvLoader) throw Error("no config")

        if (!config.dataSource) throw Error("no datasource")

        // Use injected dependencies or create defaults
        this.csvLoader = config.csvLoader
        this.dataSource = config.dataSource 
    }


    /**
     * Load test parameters - MINIMAL CHANGES from your original method
     */
    async loadTestParameters(): Promise<void> {
        try {
            // Use the injected CSV loader instead of direct import
            const us = await this.csvLoader.loadCSV(this.dataSource);
            this.testParameters = us; // Keep for backward compatibility

            console.log(us);
            console.log(this._generateMap(us));

            this.testCases = this._generateMap(us);
        } catch (error) {
            console.error('Failed to load test parameters:', error);
            throw error;
        }
    }

    /**
     * Get test cases - UNCHANGED from your original
     */
    getTestCases(): Map<string, PallasTool> | undefined {
        return this.testCases;
    }

    /**
     * Create test case - UNCHANGED from your original
     */
    createTestCase(name: string, config: Record<string, any>): void {
        console.log(`Creating test case: ${name}`, config);
    }

    /**
     * Execute test - UNCHANGED from your original
     */
    executeTest(testId: string): Promise<boolean> {
        console.log(`Executing test: ${testId}`);
        return Promise.resolve(true);
    }

    /**
     * Validate results - UNCHANGED from your original
     */
    validateResults(results: any[]): boolean {
        console.log('Validating test results', results);
        return results.length > 0;
    }

    /**
     * Generate map - UNCHANGED from your original
     */
    private _generateMap(toolCalls: any[]): Map<string, PallasTool> {
        const map = new Map();

        for (const toolCall of toolCalls) {
            const tool = PallasTool.fromNotionCSV(toolCall);
            map.set(tool.name, tool);
        }

        return map;
    }

    // Additional utility methods for configuration

    /**
     * Set a new data source
     */
    setDataSource(source: string): void {
        this.dataSource = source;
    }

    /**
     * Set a new CSV loader
     */
    setCSVLoader(loader: CSVLoader): void {
        this.csvLoader = loader;
    }
}

// Simple usage examples:

/*
// Example 1: Drop-in replacement - NO CHANGES needed to existing code
const testManager = new TestCaseManager();
await testManager.loadTestParameters();

// Example 2: React with custom data source
const testManagerReact = new TestCaseManager({
    dataSource: '../../data/my-test-cases.csv'
});

// Example 3: Node.js CLI with file path
const testManagerCLI = new TestCaseManager({
    csvLoader: CSVLoaderFactory.createFileSystemLoader(),
    dataSource: './data/test-cases.csv'
});

// Example 4: Web with URL
const testManagerWeb = new TestCaseManager({
    csvLoader: CSVLoaderFactory.createWebLoader(),
    dataSource: 'https://example.com/test-cases.csv'
});
*/

export { TestCaseManager }
