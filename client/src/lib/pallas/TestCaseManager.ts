import { PallasTool } from "./index.js";
import { CSVLoader } from "./csv.js";

interface TestCaseManagerConfig {
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

class TestCaseManager {
  private testCases: Map<string, PallasTool> | undefined;
  private csvLoader: CSVLoader;
  private dataSource: string;

  constructor(config: TestCaseManagerConfig = {}) {
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
      console.error("Failed to load test parameters:", error);
      throw error;
    }
  }

  getTestCases(): Map<string, PallasTool> | undefined {
    return this.testCases;
  }

  private _generateMap(toolCalls: TestParameters[]): Map<string, PallasTool> {
    const map = new Map();
    for (const toolCall of toolCalls) {
      const tool = PallasTool.fromNotionCSV(toolCall as Record<string, string>);
      map.set(tool.name, tool);
    }
    return map;
  }
}

export { TestCaseManager };
export type { TestCaseManagerConfig as ITestCaseManagerConfig, TestParameters, TestConfig, TestResults };