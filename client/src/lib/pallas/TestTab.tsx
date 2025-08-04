import { BrowserCSVLoader } from "./csv";
import {  PallasTool } from "./index";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { LocalStorage, Storage } from "./storage";

import { PastTests } from "./PastTests";
import { MultiLevelSelector } from "./MultiLevelSelector";
import { TabsContent } from "@/components/ui/tabs";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { TestCaseManager } from "./TestCaseManager";

interface TestSelection {
  category: string;
  test: string;
}

interface CategoryItem {
  name: string;
}

interface Category {
  name: string;
  expanded: boolean;
  items: CategoryItem[];
}

type TestCaseMap = Map<string, PallasTool>;

interface StoredTestTool {
  name: string;
  arguments: unknown;
}

const csvLoader = new BrowserCSVLoader();

const testCaseManager = new TestCaseManager({
  csvLoader,
  dataSource: "testCases.csv",
});

class StorageManager {
  private STORAGE_KEY = "__INSPECTOR_BULK_TOOL_CALLS";
  private historyTests: StoredTestTool[][] = [];
  private STORAGE_LIMIT = 3;

  constructor(private storage: Storage) {}

  async loadSaved(): Promise<void> {
    const saved = this.storage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved as string);
        this.historyTests = parsed || [];
      } catch (e) {
        console.error("Failed to parse saved history tests:", e);
        this.historyTests = [];
      }
    }
  }

  getHistoryTests(): PallasTool[][] {
    return this.historyTests.map((testArray) =>
      testArray.map((tool) => this.convertStoredToolToPallasTool(tool)),
    );
  }

  private convertStoredToolToPallasTool(
    storedTool: StoredTestTool,
  ): PallasTool {
    const [server, ...toolParts] = storedTool.name.split("-");
    const toolName = toolParts.join("-");

    return new PallasTool({
      server,
      toolName,
      args: storedTool.arguments,
    });
  }

  private formatSelectedForStorage(map: TestCaseMap): StoredTestTool[] {
    const data: StoredTestTool[] = [];
    for (const [, pallasTool] of map.entries()) {
      const out = pallasTool.getToStorage();
      data.push(out);
    }
    return data;
  }

  async storeLastTests(map: TestCaseMap): Promise<void> {
    this.historyTests.push(this.formatSelectedForStorage(map));

    if (this.historyTests.length > this.STORAGE_LIMIT) {
      this.historyTests.shift();
    }

    try {
      const data = this.historyTests.map((tests) => {
        return tests.map((tool) => ({
          name: tool.name,
          arguments: tool.arguments,
        }));
      });
      this.storage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Error in StorageManager.storeLastTests:", e);
    }
  }
}

class StorageStore {
  private listeners: Set<() => void> = new Set();
  private cachedSnapshot: PallasTool[][] = [];

  constructor(private storageManager: StorageManager) {
    this.cachedSnapshot = this.storageManager.getHistoryTests();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => {
    return this.cachedSnapshot;
  };

  getServerSnapshot = () => {
    return [];
  };

  async storeLastTests(map: TestCaseMap): Promise<void> {
    await this.storageManager.storeLastTests(map);
    this.cachedSnapshot = this.storageManager.getHistoryTests();
    this.notifyListeners();
  }

  private notifyListeners(): void {
    setTimeout(() => {
      this.listeners.forEach((listener) => listener());
    }, 0);
  }
}

const storage = new LocalStorage();
const storageManager = new StorageManager(storage);

await storageManager.loadSaved();
const storageStore = new StorageStore(storageManager);

function useStorageManager() {
  const historyTests = useSyncExternalStore(
    storageStore.subscribe,
    storageStore.getSnapshot,
    storageStore.getServerSnapshot,
  );

  const storeTests = useCallback(async (map: TestCaseMap) => {
    await storageStore.storeLastTests(map);
  }, []);

  return {
    historyTests,
    storeTests,
  };
}

interface TestTabProps {
  tools: Tool[];
  callTool: (toolName: string, args: unknown) => Promise<unknown>;
  isConnected: boolean;
}

const TestTab = ({ tools, callTool }: TestTabProps) => {
  const [myCategories, setMyCategories] = useState<Category[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const { historyTests, storeTests } = useStorageManager();

  const handleFileUpload = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      try {
        setFileUploadError(null);

        await csvLoader.loadFromFile(file);
        await testCaseManager.loadTestParameters();

        setIsDataLoaded(true);
      } catch (error) {
        console.error("Failed to load CSV file:", error);
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        setFileUploadError(`Failed to load CSV: ${errorMessage}`);
        setIsDataLoaded(false);
      }
    },
    [],
  );

  const handleRunTests = useCallback(async (data: TestSelection[]) => {
    const testCases = testCaseManager.getTestCases() || new Map();
    const filter = filterTestCases(data, testCases);

    for (const [name, tool] of filter.entries()) {
      console.info("calling tool: " + name);
      callTool(name, tool.arguments);
    }

    await storeTests(filter);
  }, [callTool, storeTests]);

  const memoTests = useMemo(() => {
    return historyTests.length > 0 ? historyTests : [];
  }, [historyTests]);

  useEffect(() => {
    if (isDataLoaded) {
      setMyCategories(parsedToolForSelector(tools));
    }
  }, [tools, isDataLoaded]);

  const memoCallTools = useCallback(
    async (arr: Pick<PallasTool, "arguments" | "name">[]): Promise<void> => {
      const promises = arr.map(async (testTool) => {
        console.info("calling tool: " + testTool.name);
        const res = await callTool(testTool.name, testTool.arguments);
        return res;
      });

      await Promise.all(promises);
      console.info(`done all ${promises.length} calls`);
    },
    [callTool],
  );

  const handlePastTestClick = useCallback(
    (pastTests: PallasTool[]) => {
      console.log(pastTests);
      memoCallTools(pastTests);
    },
    [memoCallTools],
  );

  return (
    <TabsContent value="test">
      {!isDataLoaded && (
        <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <label
            htmlFor="csv-upload"
            className="block text-sm font-medium mb-2"
          >
            Upload Test Cases CSV
          </label>
          <input
            id="csv-upload"
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
          />
          {fileUploadError && (
            <p className="mt-2 text-sm text-red-600">{fileUploadError}</p>
          )}
        </div>
      )}

      {isDataLoaded && (
        <>
          <PastTests history={memoTests} onTestsClick={handlePastTestClick} />
          {myCategories && (
            <MultiLevelSelector
              categories={myCategories}
              enabledTests={testCaseManager.getTestCases() || new Map()}
              onRunTests={handleRunTests}
            />
          )}
        </>
      )}
    </TabsContent>
  );
};

function parsedToolForSelector(tools: Tool[]): Category[] {
  const delimiter = "-";
  let firstDelimiter: number;
  const map = new Map<string, Category>();

  function ensureCategory(category?: string): Category {
    if (!category) category = "uncategorized";
    if (!map.has(category)) {
      map.set(category, {
        name: category,
        expanded: true,
        items: [],
      });
    }
    return map.get(category)!;
  }

  for (const tool of tools) {
    firstDelimiter = tool.name.indexOf(delimiter);

    if (firstDelimiter === -1) {
      const category = ensureCategory();
      category.items.push({
        name: tool.name,
      });
    } else {
      const category = ensureCategory(tool.name.substring(0, firstDelimiter));
      category.items.push({
        name: tool.name.substring(firstDelimiter + 1),
      });
    }
  }

  return [...map.values()];
}

function filterTestCases(
  declaration: TestSelection[],
  available: TestCaseMap,
): TestCaseMap {
  const map: TestCaseMap = new Map();
  for (const selected of declaration) {
    const key = `${selected.category}-${selected.test}`;
    console.debug("checking", key, available.has(key));
    if (available.has(key)) {
      console.info("has " + key);
      const tool = available.get(key);
      if (tool) {
        map.set(key, tool);
      }
    }
  }

  return map;
}

export default TestTab;