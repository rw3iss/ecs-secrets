#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const yargs_1 = __importDefault(require("yargs"));
const helpers_1 = require("yargs/helpers");
const client_ssm_1 = require("@aws-sdk/client-ssm");
const credential_providers_1 = require("@aws-sdk/credential-providers");
const loadEnv_1 = require("./utils/loadEnv");
// attempt to load env file vars (and dont fail if none found)
(0, loadEnv_1.loadEnv)();
// ----------------------
// CLI argument parsing
// ----------------------
const argv = (0, yargs_1.default)((0, helpers_1.hideBin)(process.argv))
    .scriptName("ecs-secrets")
    .usage('ecs-secrets <taskFile> [args]')
    .option("region", {
    alias: "r",
    type: "string",
    describe: "AWS region",
})
    .option("accessId", {
    alias: "i",
    type: "string",
    describe: "AWS access key ID",
})
    .option("accessKey", {
    alias: "s",
    type: "string",
    describe: "AWS secret access key",
})
    .option("token", {
    alias: "t",
    type: "string",
    describe: "AWS session token (optional)",
})
    .option("profile", {
    alias: "p",
    type: "string",
    describe: "AWS profile name (if using credentials)",
})
    .option("output", {
    alias: "o",
    type: "string",
    describe: "Output file path (optional)",
})
    .option("decrypt", {
    alias: "d",
    type: "boolean",
    describe: "Set true if your SSM is encrypted",
    default: false,
})
    // .command('help', "Show the help menu",
    // 	function(argv) {
    // 		argv.showHelp()
    // 	})
    .help('h', "Show the help menu", true)
    .epilogue('Example usage:\necs-secrets <task-definition.json> -i <accessKeyId> -a <accessKeySecret> -r <region> -o <output>')
    .parseSync();
// ----------------------
// Credential resolution
// Priority: CLI > dotenv/env > profile
// ----------------------
async function resolveCredentials() {
    if (argv.accessId && argv.accessKey) {
        return {
            accessKeyId: argv.accessId,
            secretAccessKey: argv.accessKey,
            sessionToken: argv.token || process.env.AWS_SESSION_TOKEN,
        };
    }
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
        return (0, credential_providers_1.fromEnv)()();
    }
    if (argv.profile || process.env.AWS_PROFILE) {
        const profile = argv.profile || process.env.AWS_PROFILE;
        return (0, credential_providers_1.fromIni)({ profile })();
    }
    throw new Error("No AWS credentials found from command-line, ENVs, or credentials file. See ecs-secrets -h");
}
// ----------------------
// Helpers
// ----------------------
function scrubArn(param) {
    // Example: arn:aws:ssm:region:account:parameter/my-param
    const arnPrefix = /^arn:aws:ssm:[^:]+:[^:]+:parameter\//;
    return param.replace(arnPrefix, "");
}
async function fetchParameters(ssm, names, withDecryption) {
    const results = {};
    const batches = [];
    // Split into batches of 10
    for (let i = 0; i < names.length; i += 10) {
        batches.push(names.slice(i, i + 10));
    }
    // Fetch in parallel
    const responses = await Promise.all(batches.map((batch) => ssm.send(new client_ssm_1.GetParametersCommand({
        Names: batch,
        WithDecryption: withDecryption,
    }))));
    for (const res of responses) {
        res.Parameters?.forEach((p) => {
            if (p.Name && p.Value !== undefined) {
                results[p.Name] = p.Value;
            }
        });
    }
    return results;
}
// ----------------------
// Main
// ----------------------
(async () => {
    try {
        if (!argv._[0])
            throw new Error("Must supply a task definition file. See ecs-secrets -h for help.");
        const taskPath = path_1.default.resolve(argv._[0]);
        if (!fs_1.default.existsSync(taskPath)) {
            throw new Error(`Task definition file not found: ${taskPath}`);
        }
        const taskDef = JSON.parse(fs_1.default.readFileSync(taskPath, "utf-8"));
        const secrets = taskDef.containerDefinitions
            ?.flatMap((c) => c.secrets || [])
            .map((s) => ({
            name: s.name,
            param: scrubArn(s.valueFrom),
        }));
        if (!secrets || secrets.length === 0) {
            throw new Error("No secrets found in task definition.");
        }
        const paramNames = secrets.map((s) => s.param);
        const credentials = await resolveCredentials();
        const ssm = new client_ssm_1.SSMClient({
            region: argv.region || process.env.AWS_REGION,
            credentials,
        });
        const values = await fetchParameters(ssm, paramNames, argv.decrypt);
        const outputLines = secrets.map((s) => `${s.name}=${values[s.param] || ""}`);
        if (argv.output) {
            fs_1.default.writeFileSync(argv.output, outputLines.join("\n") + "\n");
            console.log(`✅ Wrote ${secrets.length} secrets to ${argv.output}`);
        }
        else {
            console.log(`✅Retrieved ${secrets.length} values from ${argv._[0]}:\n`);
            console.log(outputLines.join("\n"));
        }
    }
    catch (err) {
        console.error("❌ Error:", err.message);
        process.exit(1);
    }
})();
