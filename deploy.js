#!/usr/bin/env node

// Load environment variables from .env
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

/* ============================
   Winston Logger Configuration
   ============================ */
const { createLogger, format, transports } = require('winston');

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new transports.Console()
    ]
});
/* ============================ */

// -----------------------------
// Read project name from CLI
// -----------------------------
const projectName = process.argv[2];

if (!projectName) {
    logger.error('Usage: node test-deploy.js <project-name>');
    process.exit(1);
}

logger.info(`Starting deploy test for project: ${projectName}`);

// -----------------------------
// Load projects.json
// -----------------------------
const projectsData = JSON.parse(fs.readFileSync('./projects.json', 'utf8'));
const projects = projectsData.projects;

// Find project
const project = projects.find(p => p.name === projectName);
if (!project) {
    logger.error(`Project "${projectName}" not found in projects.json`);
    process.exit(1);
}

const deployScript = project.deployScript;
const deployDir = path.dirname(deployScript);

logger.info(`Deploy script: ${deployScript}`);
logger.info(`Working directory: ${deployDir}`);

// -----------------------------
// Prepare log file
// -----------------------------
const logFile = path.join(deployDir, 'deploy.log');
const out = fs.openSync(logFile, 'a');
const err = fs.openSync(logFile, 'a');

// -----------------------------
// Spawn deploy script
// -----------------------------
const deploy = spawn(deployScript, {
    shell: true,
    detached: true,
    stdio: ['ignore', out, err],
    cwd: deployDir
});

deploy.unref();

logger.info(`Deploy script executed successfully`);
logger.info(`PID: ${deploy.pid}`);
logger.info(`Logs: ${logFile}`);
