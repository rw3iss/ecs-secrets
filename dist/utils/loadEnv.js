"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = exports.envFilePath = void 0;
const dotenv_1 = require("dotenv");
const fs_1 = require("fs");
const path_1 = require("path");
const nodeEnv = process.env.NODE_ENV;
exports.envFilePath = (0, path_1.join)(process.cwd(), `.env${nodeEnv ? ('.' + nodeEnv) : ''}`);
let _envLoaded = false;
const loadEnv = (filename) => {
    if (_envLoaded)
        return console.log(`${exports.envFilePath} env file is already loaded.`);
    if (!(0, fs_1.existsSync)(exports.envFilePath)) {
        //sconsole.warn(`No env file '${envFilePath}' found for NODE_ENV=${nodeEnv}.`);
    }
    else {
        (0, dotenv_1.config)({ path: exports.envFilePath });
        console.log(`Loaded ENV file:`, exports.envFilePath);
    }
    _envLoaded = true;
};
exports.loadEnv = loadEnv;
