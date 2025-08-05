import { TestableTool } from "./index";

interface PastTestProps {
  history: TestableTool[][];
  onTestsClick: (tests: TestableTool[]) => void;
}

function PastTests({ history, onTestsClick }: PastTestProps) {
  if (!history || history.length === 0) {
    return (
      <div className="text-gray-500 dark:text-gray-400 text-sm italic">
        No saved tests available
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {history.map((tools, index) => (
        <div
          key={index}
          className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 
                     bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 
                     cursor-pointer transition-colors duration-200 shadow-sm hover:shadow-md"
          onClick={() => onTestsClick(tools)}
        >
          <div className="text-sm text-gray-600 dark:text-gray-300">
            Saved Test {index + 1} • {tools.length} tool{tools.length !== 1 ? 's' : ''}
          </div>
          <div className="flex flex-wrap gap-1 mt-1">
            {tools.slice(0, 3).map((tool, toolIndex) => (
              <span
                key={toolIndex}
                className="inline-block px-2 py-1 text-xs font-medium 
                           bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 
                           rounded-md"
              >
                {tool.name}
              </span>
            ))}
            {tools.length > 3 && (
              <span className="text-xs text-gray-500 dark:text-gray-400 px-1 py-1">
                +{tools.length - 3} more
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export { PastTests };