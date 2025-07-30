import { PallasTool } from "@/lib/pallas";

interface PastTestProps {
  history: PallasTool[][];
}

function PastTests({ history }: PastTestProps) {
  return (
    <div>
      {history &&
        history.map((tools) => {
          return (
            <div className="border-4">
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
