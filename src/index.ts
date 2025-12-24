
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;
const JIRA_USERNAME = process.env.JIRA_USERNAME;
const JIRA_PASSWORD = process.env.JIRA_PASSWORD;
const JIRA_PAT = process.env.JIRA_PAT;

if (!JIRA_URL || (!JIRA_PAT && (!JIRA_USERNAME || !JIRA_PASSWORD))) {
    console.error("Error: JIRA_URL and either JIRA_PAT or (JIRA_USERNAME and JIRA_PASSWORD) must be set in .env");
    process.exit(1);
}

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

server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "jira_search",
                description: "Search Jira issues based on text query (fuzzy search)",
                inputSchema: {
                    type: "object",
                    properties: {
                        query: {
                            type: "string",
                            description: "Text to search for in Jira issues",
                        },
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
                        jql: {
                            type: "string",
                            description: "JQL query string (e.g., 'project = PROJ AND status = Open')",
                        },
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
                        issueIdOrKey: {
                            type: "string",
                            description: "The ID or Key of the issue (e.g., PROJ-123)",
                        },
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
                        issueIdOrKey: {
                            type: "string",
                            description: "The ID or Key of the issue to comment on",
                        },
                        comment: {
                            type: "string",
                            description: "The comment text to add",
                        },
                    },
                    required: ["issueIdOrKey", "comment"],
                },
            },
        ],
    };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    // Common auth config builder
    const getAxiosConfig = () => {
        let config: any = {
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            }
        };
        if (JIRA_PAT) {
            config.headers["Authorization"] = `Bearer ${JIRA_PAT}`;
        } else {
            config.auth = {
                username: JIRA_USERNAME,
                password: JIRA_PASSWORD,
            };
        }
        return config;
    };

    if (request.params.name === "jira_search") {
        const querySchema = z.object({ query: z.string() });
        const parsed = querySchema.safeParse(request.params.arguments);
        if (!parsed.success) throw new Error("Invalid arguments: query is required");
        const { query } = parsed.data;

        try {
            const jql = `text ~ "${query}"`;
            const config = getAxiosConfig();
            config.params = {
                jql,
                fields: "key,summary,status,description",
                maxResults: 10,
            };

            const response = await axios.get(`${JIRA_URL}/rest/api/2/search`, config);
            const issues = response.data.issues.map((issue: any) => ({
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                link: `${JIRA_URL}/browse/${issue.key}`,
            }));

            return {
                content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
            };
        } catch (error: any) {
            console.error("Jira API Error:", error.response?.data || error.message);
            return {
                content: [{ type: "text", text: `Error: ${error.message}` }],
                isError: true,
            };
        }
    }

    if (request.params.name === "jira_search_jql") {
        const querySchema = z.object({ jql: z.string() });
        const parsed = querySchema.safeParse(request.params.arguments);
        if (!parsed.success) throw new Error("Invalid arguments: jql is required");
        const { jql } = parsed.data;

        try {
            const config = getAxiosConfig();
            config.params = {
                jql,
                fields: "key,summary,status,description",
                maxResults: 50, // Higher limit for JQL
            };

            const response = await axios.get(`${JIRA_URL}/rest/api/2/search`, config);
            const issues = response.data.issues.map((issue: any) => ({
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                link: `${JIRA_URL}/browse/${issue.key}`,
            }));

            return {
                content: [{ type: "text", text: JSON.stringify(issues, null, 2) }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message} ${JSON.stringify(error.response?.data || '')}` }],
                isError: true,
            };
        }
    }

    if (request.params.name === "jira_get_issue") {
        const querySchema = z.object({ issueIdOrKey: z.string() });
        const parsed = querySchema.safeParse(request.params.arguments);
        if (!parsed.success) throw new Error("Invalid arguments: issueIdOrKey is required");
        const { issueIdOrKey } = parsed.data;

        try {
            const config = getAxiosConfig();
            const response = await axios.get(`${JIRA_URL}/rest/api/2/issue/${issueIdOrKey}`, config);

            // Return full details, but maybe simplified? Use user request "entire detail"
            // We will return the full JSON but maybe stringified
            return {
                content: [{ type: "text", text: JSON.stringify(response.data, null, 2) }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message} ${JSON.stringify(error.response?.data || '')}` }],
                isError: true,
            };
        }
    }

    if (request.params.name === "jira_add_comment") {
        const querySchema = z.object({ issueIdOrKey: z.string(), comment: z.string() });
        const parsed = querySchema.safeParse(request.params.arguments);
        if (!parsed.success) throw new Error("Invalid arguments: issueIdOrKey and comment are required");
        const { issueIdOrKey, comment } = parsed.data;

        try {
            const config = getAxiosConfig();
            const response = await axios.post(`${JIRA_URL}/rest/api/2/issue/${issueIdOrKey}/comment`, {
                body: comment
            }, config);

            return {
                content: [{ type: "text", text: `Comment added successfully. ID: ${response.data.id}` }],
            };
        } catch (error: any) {
            return {
                content: [{ type: "text", text: `Error: ${error.message} ${JSON.stringify(error.response?.data || '')}` }],
                isError: true,
            };
        }
    }

    throw new Error(`Tool not found: ${request.params.name}`);
});

async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("Jira MCP Server running on stdio");
}

main().catch((error) => {
    console.error("Server error:", error);
    process.exit(1);
});
