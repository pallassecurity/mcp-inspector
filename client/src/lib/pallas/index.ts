class TestableTool {
  private toolName: string;
  private args: unknown;

  constructor({
    toolName,
    args,
  }: {
    toolName: string;
    args: unknown;
    delimiter?: string;
  }) {
    this.toolName = toolName;
    this.args = args;
  }

  get name(): string {
    return this.toolName;
  }

  get arguments(): unknown {
    return this.args;
  }

  formatForStorage() {
    const data = {
      tool: this.toolName,
      arguments: this.arguments,
    };
    console.log(data);
    return data;
  }

  static fromCSV(row: Record<string, string>): TestableTool {
    const KEY_TOOL_NAME = "tool";
    const KEY_ARGUMENTS = "arguments";

    const toolName = row[KEY_TOOL_NAME];
    const argsString = row[KEY_ARGUMENTS];

    if (!toolName) {
      throw new Error(`Missing required field: ${KEY_TOOL_NAME}`);
    }
    if (!argsString) {
      throw new Error(`Missing required field: ${KEY_ARGUMENTS}`);
    }

    return new TestableTool({
      toolName,
      args: JSON.parse(argsString),
    });
  }
}

export { TestableTool };
