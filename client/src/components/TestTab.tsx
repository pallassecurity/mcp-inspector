import { StaticBundlerCSVLoader } from "@/lib/pallas/lib/csv";
import { MultiLevelSelector } from "./MultiLevelSelector";
import { TabsContent } from "./ui/tabs";
import { TestCaseManager } from "@/lib/pallas/testManager";
import { PallasService, PallasTool } from "@/lib/pallas";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Tool } from "@/lib/pallas-sdk";
import { LocalStorage, Storage } from "@/lib/pallas/lib/storage";
import { PastTests } from "./PastTests";

const csvLoader = new StaticBundlerCSVLoader();
csvLoader.registerImport(
  "../data/testCases.csv",
  () => import("../data/testCases.csv"),
);

const created = PallasService.create(
  new TestCaseManager({ csvLoader, dataSource: "../data/testCases.csv" }),
);
created.loadTestParameters();

// Keep StorageManager clean - no React-specific code
class StorageManager {
  private STORAGE_KEY = "remember";
  private historyTests: PallasTool[][] = [];
  private STORAGE_LIMIT = 3;

  constructor(private storage: Storage) {}

  async loadSaved() {
    const saved = this.storage.getItem(this.STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.historyTests = parsed || [];
      } catch (e) {
        console.error("Failed to parse saved history tests:", e);
        this.historyTests = [];
      }
    }
  }

  getHistoryTests(): PallasTool[][] {
    return [...this.historyTests]; // Return a copy to prevent direct mutations
  }

  private formatSelectedForStorage(map) {
    const data = [];
    for (const [fullName, pallasTool] of map.entries()) {
      const out = pallasTool.getToStorage();
      data.push(out);
    }
    return data;
  }

  async storeLastTests(map) {
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

// Separate store adapter for React integration
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

  async storeLastTests(map) {
    await this.storageManager.storeLastTests(map);
    // Update cached snapshot
    this.cachedSnapshot = this.storageManager.getHistoryTests();
    this.notifyListeners();
  }

  private notifyListeners() {
    // Defer to next tick to avoid update loops
    setTimeout(() => {
      this.listeners.forEach(listener => listener());
    }, 0);
  }
}

// Create instances
const storage = new LocalStorage();
const storageManager = new StorageManager(storage);

await storageManager.loadSaved();
const storageStore = new StorageStore(storageManager);


// Custom hook using useSyncExternalStore with the separate store
function useStorageManager() {
  const historyTests = useSyncExternalStore(
    storageStore.subscribe,
    storageStore.getSnapshot,
    storageStore.getServerSnapshot
  );

  const storeTests = useCallback(async (map) => {
    await storageStore.storeLastTests(map);
  }, []);

  return {
    historyTests,
    storeTests,
  };
}

interface TestTabProps {
  tools: Tool[];
  callTool: (toolName: string, args) => Promise<any>;
  isConnected: boolean;
}

const TestTab = ({ tools, callTool }: TestTabProps) => {
  const [myCategories, setMyCategories] = useState<any>([]);
  const { historyTests, storeTests } = useStorageManager();

  // Now memoTests uses the live historyTests from useSyncExternalStore
  const memoTests = useMemo(() => {
    return historyTests.length > 0 ? historyTests : [
      [{ name: "wfiwe", arguments: {} }],
      [{ name: "another", arguments: {} }],
    ];
  }, [historyTests]);

  useEffect(() => {
    console.debug("hi", created.getTestCases());
    setMyCategories(parsedToolForSelector(tools));
  }, [tools]);

  return (
    <TabsContent value="test">
      <PastTests history={memoTests} />
      {myCategories && (
        <MultiLevelSelector
          categories={myCategories}
          enabledTests={created.getTestCases()}
          onRunTests={async (data) => {
            console.log(data);
            console.log(created.getTestCases());

            const filter = filterTestCases(data, created.getTestCases());
            console.log(filter);
            console.info("run these");
            
            for (const [name, tool] of filter.entries()) {
              console.info("calling tool: " + name);
              callTool(name, tool.arguments);
            }

            // Use the hook's storeTests method which will automatically update React state
            await storeTests(filter);
          }}
        />
      )}
    </TabsContent>
  );
};

function parsedToolForSelector(tools: Tool[]) {
  const delimiter = "-";
  let firstDelimiter;
  const map = new Map();

  function ensureCategory(category?: string) {
    if (!category) category = "uncategorized";
    if (!map.has(category)) {
      map.set(category, {
        name: category,
        expanded: true,
        items: [],
      });
    }
    return map.get(category);
  }

  for (const tool of tools) {
    firstDelimiter = tool.name.indexOf(delimiter);

    if (firstDelimiter === -1) {
      const category = ensureCategory();
      category.items.push({
        name: tool,
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

function filterTestCases(declaration, available) {
  console.log({
    declaration,
    available,
  });

  const map = new Map();
  for (const selected of declaration) {
    const key = `${selected.category}-${selected.test}`;
    console.debug("checking", key, available.has(key));
    if (available.has(key)) {
      console.info("has " + key);
      map.set(key, available.get(key));
    }
  }

  return map;
}

export default TestTab;