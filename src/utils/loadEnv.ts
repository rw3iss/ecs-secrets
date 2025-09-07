import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join } from 'path';

const nodeEnv = process.env.NODE_ENV;

export let envFilePath = join(process.cwd(), `.env${nodeEnv ? ('.' + nodeEnv) : ''}`);

let _envLoaded = false;
export const loadEnv = (filename?: string) => {
	if (_envLoaded) return console.log(`${envFilePath} env file is already loaded.`);

	if (!existsSync(envFilePath)) {
		//sconsole.warn(`No env file '${envFilePath}' found for NODE_ENV=${nodeEnv}.`);
	} else {
		config({ path: envFilePath });
		console.log(`Loaded ENV file:`, envFilePath);
	}
	_envLoaded = true;
};
