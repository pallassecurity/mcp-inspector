class PallasTool {
  private fullName: string;
  private server: string;
  private toolName: string;
  private args: unknown;

  constructor({
    server,
    toolName,
    args,
    delimiter = "-",
  }: {
    server: string;
    toolName: string;
    args: unknown;
    delimiter?: string;
  }) {
    this.server = server;
    this.toolName = toolName;
    this.fullName = [this.server, delimiter, this.toolName].join("");
    this.args = args;
  }

  get name(): string {
    return this.fullName;
  }

  get arguments(): unknown {
    return this.args;
  }

  isSameTool(fullString: string): boolean {
    return fullString === this.fullName;
  }

  isSameServerAndTool(server: string, tool: string): boolean {
    return server === this.server && tool === this.toolName;
  }

  getToStorage() {
    const data = {
      name: this.fullName,
      arguments: this.arguments,
    };
    console.log(data);
    return data;
  }

  static fromNotionCSV(row: Record<string, string>): PallasTool {
    const KEY_SERVER_NAME = "server";
    const KEY_TOOL_NAME = "tool";
    const KEY_ARGUMENTS = "request_args";

    const server = row[KEY_SERVER_NAME];
    const toolName = row[KEY_TOOL_NAME];
    const argsString = row[KEY_ARGUMENTS];

    if (!server) {
      throw new Error(`Missing required field: ${KEY_SERVER_NAME}`);
    }
    if (!toolName) {
      throw new Error(`Missing required field: ${KEY_TOOL_NAME}`);
    }
    if (!argsString) {
      throw new Error(`Missing required field: ${KEY_ARGUMENTS}`);
    }

    return new PallasTool({
      server,
      toolName,
      args: JSON.parse(argsString),
    });
  }
}

export { PallasTool };