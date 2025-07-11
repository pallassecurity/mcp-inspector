import { Tool as MCPTool } from "@modelcontextprotocol/sdk/types.js"
import { TabsContent } from "./ui/tabs"
import { useState } from "react"
import { Tool } from "@/lib/pallas-sdk"



const TestTab = ({ tools }: { tools: MCPTool[] }) => {
    const [full, setState] = useState(tools.map(tool => new Tool(tool)))


    return <TabsContent value="test">

        {JSON.stringify(full)}

    </TabsContent>

}


export default TestTab
