import { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js"

function formatToolName(serverName: string, toolName: string) {
    return `${serverName}-${toolName}`
}

class Tool {
    private tool: MCPTool
    private server: string

    constructor(server: string, tool: MCPTool) {

        this.tool = tool
        this.server = server

    }

    get name() {
        return formatToolName(this.server, this.tool.name)
    }

    toString(){
        return this.server
    }
}


class ToolList {


}


export { Tool }
