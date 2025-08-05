import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { TabsContent } from "@/components/ui/tabs";

import { BrowserCSVLoader } from "./csv";
import { TestableTool } from "./index";
import { LocalStorage, Storage } from "./storage";
import { TestCaseManager } from "./TestCaseManager";
import { PastTests } from "./PastTests";
import { FlatTestSelector, SelectedTest } from "./FlatTestSelector";

type TestCaseMap = Map<string, TestableTool>;

type StoredTestTool = {
  name: string;
  arguments: Record<string, unknown>;
};

interface TestTabProps {
  tools: Tool[];
  callTool: (toolName: string, args: Record<string, unknown>) => Promise<void>;
  isConnected: boolean;
}

class StorageManager {
  private STORAGE_KEY = "__INSPECTOR_BULK_TOOL_CALLS";
  private historyTests: StoredTestTool[][] = [];
  private STORAGE_LIMIT = 3;
  private isLoaded = false;

  constructor(private storage: Storage) {}

  async loadSaved(): Promise<void> {
    if (this.isLoaded) return;

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
    this.isLoaded = true;
  }

  getHistoryTests(): TestableTool[][] {
    return this.historyTests.map((testArray) =>
      testArray.map((storedTool) => 
        new TestableTool({
          toolName: storedTool.name,
          args: storedTool.arguments,
        })
      ),
    );
  }

  private formatSelectedForStorage(map: TestCaseMap): StoredTestTool[] {
    const data: StoredTestTool[] = [];
    for (const [, testableTool] of map.entries()) {
      data.push({
        name: testableTool.name,
        arguments: testableTool.arguments as Record<string, unknown>,
      });
    }
    return data;
  }

  async storeLastTests(map: TestCaseMap): Promise<void> {
    this.historyTests.push(this.formatSelectedForStorage(map));

    if (this.historyTests.length > this.STORAGE_LIMIT) {
      this.historyTests.shift();
    }

    try {
      this.storage.setItem(this.STORAGE_KEY, JSON.stringify(this.historyTests));
    } catch (e) {
      console.error("Error in StorageManager.storeLastTests:", e);
    }
  }
}

class StorageStore {
  private listeners: Set<() => void> = new Set();
  private cachedSnapshot: TestableTool[][] = [];
  private isInitialized = false;

  constructor(private storageManager: StorageManager) {}

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    await this.storageManager.loadSaved();
    this.cachedSnapshot = this.storageManager.getHistoryTests();
    this.isInitialized = true;
    this.notifyListeners();
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

function useStorageManager() {
  const [isStorageLoaded, setIsStorageLoaded] = useState(false);

  const historyTests = useSyncExternalStore(
    storageStore.subscribe,
    storageStore.getSnapshot,
    storageStore.getServerSnapshot,
  );

  useEffect(() => {
    const initializeStorage = async () => {
      await storageStore.initialize();
      setIsStorageLoaded(true);
    };

    initializeStorage();
  }, []);

  const storeTests = useCallback(async (map: TestCaseMap) => {
    await storageStore.storeLastTests(map);
  }, []);

  return {
    historyTests,
    storeTests,
    isStorageLoaded,
  };
}

function filterTestCases(
  declaration: SelectedTest[],
  available: TestCaseMap,
): TestCaseMap {
  const map: TestCaseMap = new Map();
  for (const selected of declaration) {
    const key = selected.name;
    if (available.has(key)) {
      const tool = available.get(key);
      if (tool) {
        map.set(key, tool);
      }
    }
  }

  return map;
}

const csvLoader = new BrowserCSVLoader();

const testCaseManager = new TestCaseManager({
  csvLoader,
  dataSource: "testCases.csv",
});

const storage = new LocalStorage();
const storageManager = new StorageManager(storage);
const storageStore = new StorageStore(storageManager);

const TestTab = ({ tools, callTool }: TestTabProps) => {
  const [availableTools, setAvailableTools] = useState<Tool[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [fileUploadError, setFileUploadError] = useState<string | null>(null);
  const { historyTests, storeTests, isStorageLoaded } = useStorageManager();

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

  const handleRunTests = useCallback(
    async (data: SelectedTest[]) => {
      const testCases = testCaseManager.getTestCases() || new Map();
      const filter = filterTestCases(data, testCases);

      for (const [name, tool] of filter.entries()) {
        console.info("calling tool: " + name);
        callTool(name, tool.arguments as Record<string, unknown>);
      }

      await storeTests(filter);
    },
    [callTool, storeTests],
  );

  const memoizedTests = useMemo(() => {
    return isStorageLoaded && historyTests.length > 0 ? historyTests : [];
  }, [historyTests, isStorageLoaded]);

  useEffect(() => {
    if (isDataLoaded) {
      setAvailableTools(tools);
    }
  }, [tools, isDataLoaded]);

  const memoizedCallTools = useCallback(
    async (arr: TestableTool[]): Promise<void> => {
      const promises = arr.map(async (testTool) => {
        console.info("calling tool: " + testTool.name);
        const res = await callTool(testTool.name, testTool.arguments as Record<string, unknown>);
        return res;
      });

      await Promise.all(promises);
      console.info(`done all ${promises.length} calls`);
    },
    [callTool],
  );

  const handlePastTestClick = useCallback(
    (pastTests: TestableTool[]) => {
      memoizedCallTools(pastTests);
    },
    [memoizedCallTools],
  );

  return (
    <TabsContent value="test">
      {!isDataLoaded && (
        <div className="mb-4 p-4 border-2 border-dashed border-gray-300 rounded-lg">
          <label
            htmlFor="csv-upload"
            className="block text-sm font-medium mb-2"
          >
            Upload CSV
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
          <PastTests history={memoizedTests} onTestsClick={handlePastTestClick} />
          {availableTools && (
            <FlatTestSelector
              tools={availableTools}
              enabledTests={testCaseManager.getTestCases() || new Map()}
              onRunTests={handleRunTests}
            />
          )}
        </>
      )}
    </TabsContent>
  );
};

export default TestTab;