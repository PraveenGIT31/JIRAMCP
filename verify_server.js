
const { spawn } = require("child_process");
const path = require("path");

const serverPath = path.join(__dirname, "build", "index.js");

const env = {
    ...process.env,
    JIRA_URL: "https://mock.jira.com",
    JIRA_USERNAME: "mockuser",
    JIRA_PASSWORD: "mockpassword",
};

const server = spawn("node", [serverPath], {
    env,
    stdio: ["pipe", "pipe", "inherit"],
});

const listToolsRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/list",
    params: {},
};

server.stdout.on("data", (data) => {
    const output = data.toString();
    console.log("Server output:", output);

    try {
        const response = JSON.parse(output);
        if (response.id === 1 && response.result && response.result.tools) {
            const jiraTool = response.result.tools.find(
                (t) => t.name === "jira_search"
            );
            if (jiraTool) {
                console.log("SUCCESS: jira_search tool found!");
                process.exit(0);
            } else {
                console.error("FAILURE: jira_search tool NOT found in list.");
                process.exit(1);
            }
        }
    } catch (e) {
        // Ignore partial chunks or non-JSON
    }
});

server.on("error", (err) => {
    console.error("Server failed to start:", err);
    process.exit(1);
});

// Send request
server.stdin.write(JSON.stringify(listToolsRequest) + "\n");

// Timeout
setTimeout(() => {
    console.error("Timeout waiting for response");
    server.kill();
    process.exit(1);
}, 5000);
