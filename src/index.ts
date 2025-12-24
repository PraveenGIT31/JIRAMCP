
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import dotenv from "dotenv";
import { z } from "zod";
import { tools } from "./tools.js";

dotenv.config();

const server = new Server(
    {
        name: "jira-search-server",
        version: "1.0.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// MCP Tool Definitions
const TOOL_DEFINITIONS = [
    {
        name: "jira_search",
        description: "Search Jira issues based on text query (fuzzy search)",
        inputSchema: {
            type: "object",
            properties: {
                query: { type: "string", description: "Text to search for in Jira issues" },
            },
            required: ["query"],
        },
    },
    {
        name: "jira_search_jql",
        description: "Search Jira issues using JQL (Jira Query Language)",
        inputSchema: {
            type: "object",
            properties: {
                jql: { type: "string", description: "JQL query string" },
            },
            required: ["jql"],
        },
    },
    {
        name: "jira_get_issue",
        description: "Get details of a specific Jira issue",
        inputSchema: {
            type: "object",
            properties: {
                issueIdOrKey: { type: "string", description: "The ID or Key of the issue" },
            },
            required: ["issueIdOrKey"],
        },
    },
    {
        name: "jira_add_comment",
        description: "Add a comment to a Jira issue",
        inputSchema: {
            type: "object",
            properties: {
                issueIdOrKey: { type: "string", description: "The ID or Key of the issue" },
                comment: { type: "string", description: "The comment text to add" },
            },
            required: ["issueIdOrKey", "comment"],
        },
    },
];

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOL_DEFINITIONS };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "jira_search": {
                const { query } = z.object({ query: z.string() }).parse(args);
                const result = await tools.jira_search(query);
                return { content: [{ type: "text", text: result }] };
            }
            case "jira_search_jql": {
                const { jql } = z.object({ jql: z.string() }).parse(args);
                const result = await tools.jira_search_jql(jql);
                return { content: [{ type: "text", text: result }] };
            }
            case "jira_get_issue": {
                const { issueIdOrKey } = z.object({ issueIdOrKey: z.string() }).parse(args);
                const result = await tools.jira_get_issue(issueIdOrKey);
                return { content: [{ type: "text", text: result }] };
            }
            case "jira_add_comment": {
                const { issueIdOrKey, comment } = z.object({ issueIdOrKey: z.string(), comment: z.string() }).parse(args);
                const result = await tools.jira_add_comment(issueIdOrKey, comment);
                return { content: [{ type: "text", text: result }] };
            }
            default:
                throw new Error(`Tool not found: ${name}`);
        }
    } catch (error: any) {
        return {
            content: [{ type: "text", text: `Error: ${error.message}` }],
            isError: true,
        };
    }
});

async function main() {
    const transportType = process.env.TRANSPORT || "stdio";

    if (transportType === "sse") {
        const app = express();
        const PORT = process.env.PORT || 3000;
        const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

        app.use(cors());
        app.use(cors());

        // Note: Do NOT use bodyParser.json() globally as it consumes the stream for SSE messages

        // OpenAPI Endpoint
        app.get("/openapi.json", (req, res) => {
            const openApiSpec = {
                openapi: "3.0.0",
                info: {
                    title: "Jira MCP Server API",
                    version: "1.0.0",
                    description: "API for accessing Jira tools via MCP server"
                },
                servers: [{ url: BASE_URL }],
                paths: {} as any
            };

            TOOL_DEFINITIONS.forEach(tool => {
                openApiSpec.paths[`/api/${tool.name}`] = {
                    post: {
                        summary: tool.description,
                        operationId: tool.name,
                        requestBody: {
                            required: true,
                            content: {
                                "application/json": {
                                    schema: tool.inputSchema
                                }
                            }
                        },
                        responses: {
                            "200": {
                                description: "Successful operation",
                                content: {
                                    "application/json": {
                                        schema: {
                                            type: "object",
                                            properties: {
                                                content: { type: "string" }
                                            }
                                        }
                                    }
                                }
                            },
                            "500": { description: "Server error" }
                        }
                    }
                };
            });
            res.json(openApiSpec);
        });

        // REST Endpoints for Tools
        app.post("/api/:toolName", bodyParser.json(), async (req, res) => {
            const toolName = req.params.toolName;
            const args = req.body;

            try {
                let result;
                switch (toolName) {
                    case "jira_search":
                        result = await tools.jira_search(args.query);
                        break;
                    case "jira_search_jql":
                        result = await tools.jira_search_jql(args.jql);
                        break;
                    case "jira_get_issue":
                        result = await tools.jira_get_issue(args.issueIdOrKey);
                        break;
                    case "jira_add_comment":
                        result = await tools.jira_add_comment(args.issueIdOrKey, args.comment);
                        break;
                    default:
                        res.status(404).json({ error: "Tool not found" });
                        return;
                }
                res.json({ content: result });
            } catch (error: any) {
                res.status(500).json({ error: error.message });
            }
        });

        // SSE Endpoints
        let transport: SSEServerTransport | null = null;

        app.get("/sse", async (req, res) => {
            console.log("New SSE connection");
            transport = new SSEServerTransport("/messages", res);
            await server.connect(transport);
        });

        app.post("/messages", async (req, res) => {
            if (transport) {
                await transport.handlePostMessage(req, res);
            } else {
                res.status(404).json({ error: "No active SSE connection" });
            }
        });

        app.listen(PORT, () => {
            console.error(`Jira MCP Server running on SSE at ${BASE_URL}/sse`);
            console.error(`OpenAPI Spec available at ${BASE_URL}/openapi.json`);
        });
    } else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("Jira MCP Server running on stdio");
    }
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
