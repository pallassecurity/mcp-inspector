import { StaticBundlerCSVLoader } from "@/lib/pallas/lib/csv";
import { MultiLevelSelector } from "./MultiLevelSelector";
import { TabsContent } from "./ui/tabs";
import { TestCaseManager } from "@/lib/pallas/testManager";
import { PallasService } from "@/lib/pallas";
import { useEffect, useState } from "react";
import { Tool } from "@/lib/pallas-sdk";

const csvLoader = new StaticBundlerCSVLoader();
csvLoader.registerImport(
  "../data/testCases.csv",
  () => import("../data/testCases.csv"),
);

const created = PallasService.create(
  new TestCaseManager({ csvLoader, dataSource: "../data/testCases.csv" }),
);
created.loadTestParameters();

interface TestTabProps {
  tools: Tool[];
  onCallTool: (toolName: string, args: any) => Promise<any>;
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
