
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const JIRA_URL = process.env.JIRA_URL;
const JIRA_USERNAME = process.env.JIRA_USERNAME;
const JIRA_PASSWORD = process.env.JIRA_PASSWORD;
const JIRA_PAT = process.env.JIRA_PAT;

if (!JIRA_URL || (!JIRA_PAT && (!JIRA_USERNAME || !JIRA_PASSWORD))) {
    console.error("Error: JIRA_URL and either JIRA_PAT or (JIRA_USERNAME and JIRA_PASSWORD) must be set in .env");
    process.exit(1);
}

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

export interface JiraIssue {
    key: string;
    summary: string;
    status: string;
    link: string;
}

export const tools = {
    jira_search: async (query: string): Promise<string> => {
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
            return JSON.stringify(issues, null, 2);
        } catch (error: any) {
            throw new Error(`Error searching Jira: ${error.message} ${JSON.stringify(error.response?.data || '')}`);
        }
    },

    jira_search_jql: async (jql: string): Promise<string> => {
        try {
            const config = getAxiosConfig();
            config.params = {
                jql,
                fields: "key,summary,status,description",
                maxResults: 50,
            };

            const response = await axios.get(`${JIRA_URL}/rest/api/2/search`, config);
            const issues = response.data.issues.map((issue: any) => ({
                key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status.name,
                link: `${JIRA_URL}/browse/${issue.key}`,
            }));
            return JSON.stringify(issues, null, 2);
        } catch (error: any) {
            throw new Error(`Error searching Jira JQL: ${error.message} ${JSON.stringify(error.response?.data || '')}`);
        }
    },

    jira_get_issue: async (issueIdOrKey: string): Promise<string> => {
        try {
            const config = getAxiosConfig();
            const response = await axios.get(`${JIRA_URL}/rest/api/2/issue/${issueIdOrKey}`, config);
            return JSON.stringify(response.data, null, 2);
        } catch (error: any) {
            throw new Error(`Error getting issue: ${error.message} ${JSON.stringify(error.response?.data || '')}`);
        }
    },

    jira_add_comment: async (issueIdOrKey: string, comment: string): Promise<string> => {
        try {
            const config = getAxiosConfig();
            const response = await axios.post(`${JIRA_URL}/rest/api/2/issue/${issueIdOrKey}/comment`, {
                body: comment
            }, config);

            return `Comment added successfully. ID: ${response.data.id}`;
        } catch (error: any) {
            throw new Error(`Error adding comment: ${error.message} ${JSON.stringify(error.response?.data || '')}`);
        }
    }
};
