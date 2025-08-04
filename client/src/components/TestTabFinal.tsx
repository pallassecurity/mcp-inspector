import React, { useState, useCallback, useMemo, useEffect } from "react";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { MultiLevelSelector } from "../lib/pallas/MultiLevelSelector";
import { PallasService } from "../lib/pallas";
import { BundlerCSVLoader, StaticBundlerCSVLoader } from "@/lib/pallas/lib/csv";
import { TestCaseManager } from "@/lib/pallas/TestManagerOld";

const csvLoader = new StaticBundlerCSVLoader()
csvLoader.registerImport('../data/testCases.csv', () => import('../data/testCases.csv'));

const created = PallasService.create(new TestCaseManager({csvLoader, "dataSource": "../data/testCases.csv"}))
created.loadTestParameters()



interface TestResult {
  toolName: string;
  status: "running" | "success" | "error";
  result?: any;
  error?: string;
  duration?: number;
  timestamp: Date;
}

interface TestTabProps {
  tools: Tool[];
  onCallTool: (toolName: string, args: any) => Promise<any>;
  callTool: (toolName: string, args) => Promise<any>
  isConnected: boolean;
}

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

  return [...map.values()]
}

const TestTab: React.FC<TestTabProps> = ({
  tools,
  onCallTool,
  callTool,
  isConnected,
}) => {
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [toolArguments, setToolArguments] = useState<Record<string, any>>({});
  const [myCategories, setMyCategories] = useState<any>([])



  useEffect(() => {
     console.debug("hi", created.getTestCases()) 
    setMyCategories(parsedToolForSelector(tools))
  },[tools])

  const handleToolSelection = useCallback(
    (toolName: string, isSelected: boolean) => {
      setSelectedTools((prev) => {
        const newSet = new Set(prev);
        if (isSelected) {
          newSet.add(toolName);
        } else {
          newSet.delete(toolName);
        }
        return newSet;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(() => {
    if (selectedTools.size === tools.length) {
      setSelectedTools(new Set());
    } else {
      setSelectedTools(new Set(tools.map((tool) => tool.name)));
    }
  }, [tools, selectedTools.size]);

  const handleArgumentChange = useCallback(
    (toolName: string, argName: string, value: any) => {
      setToolArguments((prev) => ({
        ...prev,
        [toolName]: {
          ...prev[toolName],
          [argName]: value,
        },
      }));
    },
    [],
  );

  const runTests = useCallback(async () => {
      console.log('run test', isConnected, selectedTools)
    if (!isConnected || selectedTools.size === 0) return;

    setIsRunning(true);
    setTestResults([]);


    const testPromises = Array.from(selectedTools).map(async (toolName) => {
      const startTime = Date.now();
      const result: TestResult = {
        toolName,
        status: "running",
        timestamp: new Date(),
      };

      try {
        const args = toolArguments[toolName] || {};
        const response = await onCallTool(toolName, args);

        result.status = "success";
        result.result = response;
        result.duration = Date.now() - startTime;
      } catch (error) {
        result.status = "error";
        result.error = error instanceof Error ? error.message : String(error);
        result.duration = Date.now() - startTime;
      }

      setTestResults((prev) => [...prev, result]);
      return result;
    });

    try {
      await Promise.all(testPromises);
    } finally {
      setIsRunning(false);
    }
  }, [selectedTools, toolArguments, onCallTool, isConnected]);

  const clearResults = useCallback(() => {
    setTestResults([]);
  }, []);

  const getStatusColor = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return "text-blue-600";
      case "success":
        return "text-green-600";
      case "error":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  const getStatusIcon = (status: TestResult["status"]) => {
    switch (status) {
      case "running":
        return "🔄";
      case "success":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⏳";
    }
  };

  const renderArgumentInput = (tool: Tool, argName: string, argSchema: any) => {
    const value = toolArguments[tool.name]?.[argName] || "";
    const handleChange = (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => {
      let newValue: any = e.target.value;

      // Type conversion based on schema
      if (argSchema.type === "number") {
        newValue = parseFloat(newValue) || 0;
      } else if (argSchema.type === "boolean") {
        newValue = e.target.value === "true";
      }

      handleArgumentChange(tool.name, argName, newValue);
    };

    if (argSchema.type === "boolean") {
      return (
        <select
          value={value.toString()}
          onChange={(e) =>
            handleArgumentChange(tool.name, argName, e.target.value === "true")
          }
          className="w-full p-2 border rounded text-sm"
        >
          <option value="false">false</option>
          <option value="true">true</option>
        </select>
      );
    }

    return (
      <input
        type={argSchema.type === "number" ? "number" : "text"}
        value={value}
        onChange={handleChange}
        placeholder={argSchema.description || argName}
        className="w-full p-2 border rounded text-sm"
      />
    );
  };

  const handleTestCases = (selectedArr) => {

  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <p>hi</p>
          {myCategories && <MultiLevelSelector
            categories={myCategories}
          
            enabledTests={created.getTestCases()}
            onRunTests={async (data) => {

                console.log(data)
                console.log(created.getTestCases())

    const filter = filterTestCases(data, created.getTestCases())
    console.log(filter)
    console.info("run these")
    for (const [name, tool] of filter.entries()){

        console.info("calling tool: " + name)

//        callTool(name, tool.arguments)


        
    }

            }}
          />}
          <h2 className="text-xl font-semibold">Multi-Tool Test Runer</h2>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              disabled={!isConnected || tools.length === 0}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              {selectedTools.size === tools.length
                ? "Deselect All"
                : "Select All"}
            </button>
            <button
              onClick={clearResults}
              disabled={testResults.length === 0}
              className="px-3 py-1 text-sm border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              Clear Results
            </button>
            <button
              onClick={runTests}
              disabled={!isConnected || selectedTools.size === 0 || isRunning}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isRunning ? "Running..." : `Run ${selectedTools.size} Tools`}
            </button>
          </div>
        </div>

        {!isConnected && (
          <div className="text-amber-600 text-sm mb-4">
            ⚠️ Not connected to MCP server. Please connect first.
          </div>
        )}

        <div className="text-sm text-gray-600 mb-2">
          Select tools to run concurrently. {selectedTools.size} of{" "}
          {tools.length} tools selected.
        </div>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
          {/* Tool Selection Panel */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Available Tools</h3>
            {tools.length === 0 ? (
              <div className="text-gray-500 text-sm">No tools available</div>
            ) : (
              tools.map((tool) => (
                <div key={tool.name} className="border rounded p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTools.has(tool.name)}
                      onChange={(e) =>
                        handleToolSelection(tool.name, e.target.checked)
                      }
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{tool.name}</div>
                      {tool.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {tool.description}
                        </div>
                      )}

                      {/* Tool Arguments */}
                      {tool.inputSchema &&
                        tool.inputSchema.properties &&
                        Object.keys(tool.inputSchema.properties).length > 0 && (
                          <div className="mt-3 space-y-2">
                            <div className="text-sm font-medium">
                              Arguments:
                            </div>
                            {Object.entries(tool.inputSchema.properties).map(
                              ([argName, argSchema]: [string, any]) => (
                                <div
                                  key={argName}
                                  className="flex gap-2 items-center"
                                >
                                  <label className="text-sm min-w-0 flex-shrink-0 w-20">
                                    {argName}:
                                  </label>
                                  {renderArgumentInput(
                                    tool,
                                    argName,
                                    argSchema,
                                  )}
                                </div>
                              ),
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Results Panel */}
          <div className="space-y-3">
            <h3 className="font-medium text-gray-900">Test Results</h3>
            {testResults.length === 0 ? (
              <div className="text-gray-500 text-sm">No test results yet</div>
            ) : (
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <div key={index} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {getStatusIcon(result.status)}
                        </span>
                        <span className="font-medium">{result.toolName}</span>
                        <span
                          className={`text-sm ${getStatusColor(result.status)}`}
                        >
                          {result.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.duration && `${result.duration}ms`}
                      </div>
                    </div>

                    <div className="text-xs text-gray-500 mb-2">
                      {result.timestamp.toLocaleTimeString()}
                    </div>

                    {result.error && (
                      <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
                        {result.error}
                      </div>
                    )}

                    {result.result && (
                      <div className="text-sm bg-gray-50 p-2 rounded">
                        <pre className="whitespace-pre-wrap text-xs">
                          {JSON.stringify(result.result, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};





function filterTestCases(declaration, available){
    console.log({
        declaration,
        available
    })

    const map = new Map()
    for (const selected of declaration){
    

        const key = `${selected.category}-${selected.test}`
        console.debug("checking", key, available.has(key))
       if(available.has(key)){

           console.info("has " + key)
            map.set(key, available.get(key))
       }
    }



    
    return map


}

export default TestTab;
