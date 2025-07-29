import { StaticBundlerCSVLoader } from "@/lib/pallas/lib/csv";
import { MultiLevelSelector } from "./MultiLevelSelector";
import { TabsContent } from "./ui/tabs";
import { TestCaseManager } from "@/lib/pallas/testManager";
import { PallasService } from "@/lib/pallas";
import { useEffect, useState } from "react";
import { Tool } from "@/lib/pallas-sdk";
import { LocalStorage, Storage } from "@/lib/pallas/lib/storage";

const csvLoader = new StaticBundlerCSVLoader();
csvLoader.registerImport(
  "../data/testCases.csv",
  () => import("../data/testCases.csv"),
);

const created = PallasService.create(
  new TestCaseManager({ csvLoader, dataSource: "../data/testCases.csv" }),
);
created.loadTestParameters();
class StorageManager {
  private STORAGE_KEY = "remember";
  private historyTests = [];
  private STORAGE_LIMIT = 3;
  constructor(private storage: Storage) {}

  async loadSaved() {
    const saved = this.storage.getItem(this.STORAGE_KEY);

    const parsed = JSON.parse(saved);
    this.historyTests = parsed;
    console.log(parsed);
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

    this.storage.setItem(this.STORAGE_KEY, JSON.stringify(this.historyTests));
  }
}

const storage = new LocalStorage();
const manager = new StorageManager(storage);
await manager.loadSaved();
interface TestTabProps {
  tools: Tool[];
  callTool: (toolName: string, args) => Promise<any>;
  isConnected: boolean;
}

const TestTab = ({ tools, callTool }: TestTabProps) => {
  const [myCategories, setMyCategories] = useState<any>([]);
  useEffect(() => {
    console.debug("hi", created.getTestCases());
    setMyCategories(parsedToolForSelector(tools));
  }, [tools]);
  return (
    <TabsContent value="test">
      test
      <p>hi</p>
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

            manager.storeLastTests(filter);
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
