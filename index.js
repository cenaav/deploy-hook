// Load environment variables from .env
require('dotenv').config();

const fs = require('fs');
const path = require('path');
const express = require('express');
const bodyParser = require('body-parser');
const { spawn } = require('child_process');

//============================
//Winston Logger Configuration
//============================
const { createLogger, format, transports } = require('winston');

const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.printf(({ timestamp, level, message }) => {
            return `[${timestamp}] [${level.toUpperCase()}] ${message}`;
        })
    ),
    transports: [
        new transports.File({
            filename: path.join(logDir, 'app.log'),
            maxsize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5
        }),
        new transports.Console()
    ]
});
/* ============================ */

const app = express();
app.use(bodyParser.json());

// Load projects configuration from JSON file
// Example projects.json format:
// {
//   "projects": [
//     { "name": "exar-ui-streamlet", "deployScript": "/home/cena/projects/exar/exar-ui-streamlet/run" }
//   ]
// }
const projectsData = JSON.parse(fs.readFileSync('./projects.json', 'utf8'));
const projects = projectsData.projects;

// GET endpoint for health check / time
app.get('/', (req, res) => {
    const currentTimeSeconds = Math.floor(Date.now() / 1000);
    res.json({
        status: 'ok',
        timestamp: currentTimeSeconds
    });
});

// POST endpoint for project deploy
app.post('/project/:projectName', (req, res) => {

    // Log incoming request info
    logger.info(`Incoming request from IP: ${req.ip}, path: ${req.path}`);
    
    const projectName = req.params.projectName;
    const secretHeader = req.headers['x-deploy-secret'];
    logger.info(`Secret header: ${secretHeader}`);
    
    // Check webhook secret
    /*
    if (!secretHeader || secretHeader !== process.env.WEBHOOK_SECRET) {
        console.warn(`Invalid secret from IP: ${req.ip}`);
        return res.status(403).send('Invalid secret');
    }
    */
    
    // Find the project in projects.json
    const project = projects.find(p => p.name === projectName);
    if (!project) {
        logger.warn(`No deploy script configured for project ${projectName}`);
        return res.status(400).send(`No deploy script configured for project ${projectName}`);
    }

    const deployScript = project.deployScript;
    const deployDir = path.dirname(deployScript);

    logger.info(`Executing deploy script for project ${projectName}: ${deployScript}`);
    logger.info(`Working directory: ${deployDir}`);

    // -------------------------------------------------------------------------------

    // Spawn the deploy script in a detached background process
    /*
    const deploy = spawn(deployScript, {
        shell: true,
        detached: true,   // Run independently in the background
        stdio: 'ignore',  // Ignore stdout/stderr to avoid blocking Node.js
        cwd: deployDir    // Set working directory to the script's folder
    });
    */

    // Set log file inside project directory
    const logFile = path.join(deployDir, 'deploy.log');
    // Open log file in append mode
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');
    // Spawn deploy script and log output
    const deploy = spawn(deployScript, {
        shell: true,
        detached: true,
        stdio: ['ignore', out, err],
        cwd: deployDir
    });

    // -------------------------------------------------------------------------------
    // Allow the parent Node.js process to exit without waiting for the child
    deploy.unref();
    logger.info(`Deploy script started for project ${projectName} (PID: ${deploy.pid})`);
    // Immediately respond to the webhook request
    res.send(`Deploy triggered for project ${projectName}, PID: ${deploy.pid}`);
});

// Start Express server
const PORT = process.env.PORT || 37025;
app.listen(PORT, () => logger.info(`Deploy webhook listening on port ${PORT}`));
