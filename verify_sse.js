
const { spawn } = require("child_process");
const http = require("http");
const path = require("path");

const serverPath = path.join(__dirname, "build", "index.js");

const env = {
    ...process.env,
    TRANSPORT: "sse",
    PORT: "3000",
    JIRA_URL: "https://mock.jira.com",
    JIRA_PAT: "mocktoken",
};

const server = spawn("node", [serverPath], {
    env,
    stdio: "inherit",
});

setTimeout(() => {
    console.log("Checking SSE endpoint...");
    http.get("http://localhost:3000/sse", (res) => {
        console.log(`Response Status: ${res.statusCode}`);
        if (res.statusCode === 200) {
            console.log("SUCCESS: Connected to SSE endpoint");
            server.kill();
            process.exit(0);
        } else {
            console.error("FAILURE: Could not connect to SSE endpoint");
            server.kill();
            process.exit(1);
        }
    }).on('error', (e) => {
        console.error(`Got error: ${e.message}`);
        server.kill();
        process.exit(1);
    });
}, 3000);
