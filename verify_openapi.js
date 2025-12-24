
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
    console.log("Checking OpenAPI endpoint...");
    http.get("http://localhost:3000/openapi.json", (res) => {
        console.log(`OpenAPI Status: ${res.statusCode}`);
        let data = '';

        res.on('data', (chunk) => { data += chunk; });

        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.openapi && json.paths["/api/jira_search"]) {
                    console.log("SUCCESS: OpenAPI spec valid");
                    server.kill();
                    process.exit(0);
                } else {
                    console.error("FAILURE: Invalid OpenAPI spec");
                    server.kill();
                    process.exit(1);
                }
            } catch (e) {
                console.error("FAILURE: Parsing OpenAPI JSON");
                server.kill();
                process.exit(1);
            }
        });

    }).on('error', (e) => {
        console.error(`Got error: ${e.message}`);
        server.kill();
        process.exit(1);
    });
}, 3000);
