#!/usr/bin/env node
import fs from "fs";
import path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {
	SSMClient,
	GetParametersCommand,
} from "@aws-sdk/client-ssm";
import {
	fromIni,
	fromEnv,
} from "@aws-sdk/credential-providers";
import { AwsCredentialIdentity } from "@aws-sdk/types";
import { loadEnv } from './utils/loadEnv';
import { clearCredentialCache } from "@smithy/signature-v4";

// attempt to load env file vars (and dont fail if none found)
loadEnv();

// ----------------------
// CLI argument parsing
// ----------------------
const argv = yargs(hideBin(process.argv))
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
		describe: "AWS profile name from shared credentials",
	})
	.option("output", {
		alias: "o",
		type: "string",
		describe: "Optional output file path",
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
async function resolveCredentials(): Promise<AwsCredentialIdentity> {
	if (argv.accessId && argv.accessKey) {
		return {
			accessKeyId: argv.accessId,
			secretAccessKey: argv.accessKey,
			sessionToken: argv.token || process.env.AWS_SESSION_TOKEN,
		};
	}

	if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
		return fromEnv()();
	}

	if (argv.profile || process.env.AWS_PROFILE) {
		const profile = argv.profile || process.env.AWS_PROFILE!;
		return fromIni({ profile })();
	}

	throw new Error("No AWS credentials found from command-line, ENVs, or credentials file. See ecs-secrets -h");
}

// ----------------------
// Helpers
// ----------------------
function scrubArn(param: string): string {
	// Example: arn:aws:ssm:region:account:parameter/my-param
	const arnPrefix = /^arn:aws:ssm:[^:]+:[^:]+:parameter\//;
	return param.replace(arnPrefix, "");
}

async function fetchParameters(
	ssm: SSMClient,
	names: string[],
	withDecryption: boolean
): Promise<Record<string, string>> {
	const results: Record<string, string> = {};
	const batches: string[][] = [];

	// Split into batches of 10
	for (let i = 0; i < names.length; i += 10) {
		batches.push(names.slice(i, i + 10));
	}

	// Fetch in parallel
	const responses = await Promise.all(
		batches.map((batch) =>
			ssm.send(
				new GetParametersCommand({
					Names: batch,
					WithDecryption: withDecryption,
				})
			)
		)
	);

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
		if (!argv._[0]) throw new Error("Must supply a task definition file. See ecs-secrets -h for help.");
		const taskPath = path.resolve(argv._[0] as string);
		if (!fs.existsSync(taskPath)) {
			throw new Error(`Task definition file not found: ${taskPath}`);
		}

		const taskDef = JSON.parse(fs.readFileSync(taskPath, "utf-8"));

		const secrets = taskDef.containerDefinitions
			?.flatMap((c: any) => c.secrets || [])
			.map((s: any) => ({
				name: s.name,
				param: scrubArn(s.valueFrom),
			}));

		if (!secrets || secrets.length === 0) {
			throw new Error("No secrets found in task definition.");
		}

		const paramNames = secrets.map((s: any) => s.param);

		const credentials = await resolveCredentials();
		const ssm = new SSMClient({
			region: argv.region || process.env.AWS_REGION,
			credentials,
		});

		const values = await fetchParameters(ssm, paramNames, argv.decrypt);

		const outputLines = secrets.map(
			(s: any) => `${s.name}=${values[s.param] || ""}`
		);

		if (argv.output) {
			fs.writeFileSync(argv.output, outputLines.join("\n") + "\n");
			console.log(`✅ Wrote ${secrets.length} secrets to ${argv.output}`);
		} else {
			console.log(`✅Retrieved ${secrets.length} values from ${argv._[0]}:\n`)
			console.log(outputLines.join("\n"));
		}
	} catch (err: any) {
		console.error("❌ Error:", err.message);
		process.exit(1);
	}
})();
