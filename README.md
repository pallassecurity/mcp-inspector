# MCP Inspector with Bulk Testing

The MCP inspector that a tab that can do multiple tool calls at once. This extends the base [MCP inspector](https://github.com/pallassecurity/mcp-inspector)

![MCP Inspector Screenshot](https://raw.githubusercontent.com/pallassecurity/mcp-inspector/single/screens/upload.png)
![Selection Previous tests](https://raw.githubusercontent.com/pallassecurity/mcp-inspector/single/screens/upload.png)


## Prerequisite

Have a CSV with this format
```
name,arguments
search_repositories,"{""query"": ""user:github-user""}"
get_me,"{""reason"": ""Getting user info to then search their repositories""}"
```

## Usage
- Click "List Tools"
- Click "Test Tab"
- Upload CSV file from prerequisite
- Select tools which you want to test immediate
- Click "Run"
- Selected tool will be called with parameters from CSV