import { TestableTool } from "./index";
import { Tool } from "@modelcontextprotocol/sdk/types.js";
import React, { useState, useMemo, useCallback } from "react";

interface FlatTestSelectorProps {
  tools: Tool[];
  enabledTests?: Map<string, TestableTool>;
  onRunTests: (selectedTests: SelectedTest[]) => Promise<void>;
}

interface SelectedTest {
  name: string;
}

const createInitialData = (tools: Tool[]): Record<string, boolean> => {
  return tools.reduce(
    (acc, tool) => {
      acc[tool.name] = false;
      return acc;
    },
    {} as Record<string, boolean>,
  );
};

const getSelectedTests = (
  data: Record<string, boolean>,
  enabledTests?: Map<string, TestableTool>,
): SelectedTest[] => {
  return Object.entries(data)
    .filter(
      ([toolName, isSelected]) =>
        isSelected && isTestEnabled(enabledTests, toolName),
    )
    .map(([toolName]) => ({ name: toolName }));
};

const formatSelectedTestsForStorage = (
  selectedTests: SelectedTest[],
  enabledTests?: Map<string, TestableTool>,
) => {
  const formattedTests = selectedTests.map(({ name }) => {
    const tool = enabledTests?.get(name);

    return {
      testName: name,
      toolName: name,
      args: tool?.arguments || {},
      fullToolName: tool?.name || name,
      timestamp: new Date().toISOString(),
    };
  });

  return {
    executionId: `exec-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    totalTests: formattedTests.length,
    tests: formattedTests,
  };
};

const filterTools = (tools: Tool[], searchTerm: string): Tool[] => {
  if (!searchTerm) return tools;

  return tools.filter((tool) =>
    tool.name.toLowerCase().includes(searchTerm.toLowerCase()),
  );
};

const isTestEnabled = (
  enabledTests: Map<string, TestableTool> | undefined,
  toolName: string,
): boolean => {
  if (!enabledTests) return false;

  if (enabledTests.has(toolName)) return true;

  for (const tool of enabledTests.values()) {
    if (tool.name === toolName) {
      return true;
    }
  }

  return false;
};

const Search: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
    />
  </svg>
);

const X: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M6 18 18 6M6 6l12 12"
    />
  </svg>
);

const Play: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 0 1 0 1.972l-11.54 6.347a1.125 1.125 0 0 1-1.667-.986V5.653Z"
    />
  </svg>
);

const Clock: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    className={className}
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
    />
  </svg>
);

const useSelection = (initialData: Record<string, boolean>) => {
  const [data, setData] = useState<Record<string, boolean>>(initialData);

  const selectAll = useCallback(
    (tools: Tool[], enabledTests?: Map<string, TestableTool>) => {
      setData((prev) => {
        const enabledToolNames = tools
          .map((tool) => tool.name)
          .filter((toolName) => isTestEnabled(enabledTests, toolName));

        const hasAllSelected = enabledToolNames.every(
          (toolName) => prev[toolName],
        );

        return tools.reduce(
          (acc, tool) => {
            if (isTestEnabled(enabledTests, tool.name)) {
              acc[tool.name] = !hasAllSelected;
            } else {
              acc[tool.name] = prev[tool.name] || false;
            }
            return acc;
          },
          {} as Record<string, boolean>,
        );
      });
    },
    [],
  );

  const selectItem = useCallback((toolName: string) => {
    setData((prev) => ({
      ...prev,
      [toolName]: !prev[toolName],
    }));
  }, []);

  return {
    data,
    selectAll,
    selectItem,
  };
};

interface SearchBarProps {
  totalItems: number;
  searchTerm: string;
  onSearchChange: (term: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({
  totalItems,
  searchTerm,
  onSearchChange,
}) => (
  <div className="flex-1 relative">
    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500" />
    <input
      type="text"
      placeholder={`Search ${totalItems} tools...`}
      value={searchTerm}
      onChange={(e) => onSearchChange(e.target.value)}
      className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-blue-500 dark:focus:border-blue-400"
    />
    {searchTerm && (
      <button
        onClick={() => onSearchChange("")}
        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
      >
        <X className="w-4 h-4" />
      </button>
    )}
  </div>
);

interface ToolListProps {
  tools: Tool[];
  selectionData: Record<string, boolean>;
  enabledTests?: Map<string, TestableTool>;
  onItemSelect: (toolName: string) => void;
}

const ToolList: React.FC<ToolListProps> = ({
  tools,
  selectionData,
  enabledTests,
  onItemSelect,
}) => {
  if (tools.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500 dark:text-gray-400">
        No tools match your search
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {tools.map((tool) => {
          const enabled = isTestEnabled(enabledTests, tool.name);
          const selected = selectionData[tool.name] || false;

          return (
            <label
              key={tool.name}
              className={`flex items-center space-x-2 p-2 rounded text-sm border-l-2 border-transparent ${
                enabled
                  ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 hover:border-blue-300 dark:hover:border-blue-400"
                  : "cursor-not-allowed opacity-50 bg-gray-25 dark:bg-gray-800"
              }`}
            >
              <input
                type="checkbox"
                checked={selected}
                disabled={!enabled}
                onChange={() => enabled && onItemSelect(tool.name)}
                className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 flex-shrink-0 disabled:opacity-50 bg-white dark:bg-gray-700"
              />
              <span
                className={`truncate ${enabled ? "text-gray-700 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"}`}
              >
                {tool.name}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
};

interface HeaderProps {
  tools: Tool[];
  selectionData: Record<string, boolean>;
  enabledTests?: Map<string, TestableTool>;
  onSelectAll: () => void;
}

const Header: React.FC<HeaderProps> = ({
  tools,
  selectionData,
  enabledTests,
  onSelectAll,
}) => {
  const enabledTools = useMemo(
    () => tools.filter((tool) => isTestEnabled(enabledTests, tool.name)),
    [tools, enabledTests],
  );

  const selectedEnabledCount = useMemo(
    () => enabledTools.filter((tool) => selectionData[tool.name]).length,
    [enabledTools, selectionData],
  );

  const disabledCount = tools.length - enabledTools.length;
  const isAllSelected =
    selectedEnabledCount === enabledTools.length && enabledTools.length > 0;
  const isPartialSelected =
    selectedEnabledCount > 0 && selectedEnabledCount < enabledTools.length;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 p-4 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
      <div className="flex items-center space-x-3">
        <label className="flex items-center space-x-2 cursor-pointer">
          <input
            type="checkbox"
            checked={isAllSelected}
            ref={(el) => {
              if (el) el.indeterminate = isPartialSelected;
            }}
            onChange={onSelectAll}
            className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700"
          />
          <span className="font-medium text-gray-900 dark:text-gray-100">
            All Tools
          </span>
        </label>
      </div>

      <div className="text-sm text-gray-500 dark:text-gray-400">
        <span>
          {selectedEnabledCount} / {enabledTools.length} selected
        </span>
        {disabledCount > 0 && (
          <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
            ({disabledCount} disabled)
          </span>
        )}
      </div>
    </div>
  );
};

interface SelectionSummaryProps {
  totalSelected: number;
  onRun: () => void;
  isRunning: boolean;
}

const SelectionSummary: React.FC<SelectionSummaryProps> = ({
  totalSelected,
  onRun,
  isRunning,
}) => (
  <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
    <div className="flex justify-between items-center">
      <div>
        <span className="font-medium text-gray-900 dark:text-gray-100">
          Selected: {totalSelected} tools
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-400 ml-4">
          {totalSelected === 0 ? "Select tools to run" : "Ready to execute"}
        </span>
      </div>

      <button
        onClick={onRun}
        disabled={isRunning || totalSelected === 0}
        className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
          isRunning
            ? "bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300 cursor-not-allowed"
            : totalSelected === 0
              ? "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              : "bg-green-600 dark:bg-green-700 text-white hover:bg-green-700 dark:hover:bg-green-600 hover:shadow-lg transform hover:scale-105"
        }`}
      >
        {isRunning ? (
          <>
            <Clock className="w-5 h-5 animate-spin" />
            <span>Running Tools...</span>
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            <span>Run {totalSelected} Tools</span>
          </>
        )}
      </button>
    </div>
  </div>
);

const FlatTestSelector: React.FC<FlatTestSelectorProps> = ({
  tools,
  enabledTests,
  onRunTests,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const initialData = useMemo(() => createInitialData(tools), [tools]);
  const selection = useSelection(initialData);

  const filteredTools = useMemo(
    () => filterTools(tools, searchTerm),
    [tools, searchTerm],
  );

  const totalSelected = useMemo(() => {
    return Object.entries(selection.data).filter(
      ([toolName, isSelected]) =>
        isSelected && isTestEnabled(enabledTests, toolName),
    ).length;
  }, [selection.data, enabledTests]);

  const selectedTests = useMemo(
    () => getSelectedTests(selection.data, enabledTests),
    [selection.data, enabledTests],
  );

  const handleRunTests = useCallback(async () => {
    if (totalSelected === 0) return;

    const formattedTests = formatSelectedTestsForStorage(
      selectedTests,
      enabledTests,
    );
    console.debug("Running tests:", formattedTests);

    setIsRunning(true);
    try {
      await onRunTests(selectedTests);
    } finally {
      setIsRunning(false);
    }
  }, [totalSelected, selectedTests, enabledTests, onRunTests]);

  const handleSelectAll = useCallback(() => {
    selection.selectAll(tools, enabledTests);
  }, [selection, tools, enabledTests]);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white dark:bg-gray-900">
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">
          Tool Selection
        </h2>
        <SelectionSummary
          totalSelected={totalSelected}
          onRun={handleRunTests}
          isRunning={isRunning}
        />
      </div>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <Header
          tools={tools}
          selectionData={selection.data}
          enabledTests={enabledTests}
          onSelectAll={handleSelectAll}
        />

        <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-25 dark:bg-gray-800">
            <SearchBar
              totalItems={tools.length}
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
            />
          </div>

          <div className="max-h-96 overflow-y-auto">
            <ToolList
              tools={filteredTools}
              selectionData={selection.data}
              enabledTests={enabledTests}
              onItemSelect={selection.selectItem}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export type { FlatTestSelectorProps, SelectedTest };
export { FlatTestSelector };
