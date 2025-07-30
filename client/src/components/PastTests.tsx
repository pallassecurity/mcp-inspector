import { PallasTool } from "@/lib/pallas";

interface PastTestProps {
  history: PallasTool[][];
  onTestsClick: (tests: PallasTool[]) => void;
}

function PastTests({ history, onTestsClick }: PastTestProps) {
  return (
    <div>
      {history &&
        history.map((tools) => {
          return (
            <div className="border-4" onClick={() => onTestsClick(tools)}>
              {tools &&
                tools.map((tool) => {
                  return <div>{tool.name}</div>;
                })}
            </div>
          );
        })}
    </div>
  );
}

export { PastTests };
