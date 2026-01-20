const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { fork } = require('child_process');
const isDev = require('electron-is-dev'); // You might need to install this or handle dev check manually

// Setup Logger
const userDataPath = app.getPath('userData');
const mainLogPath = path.join(userDataPath, 'main.log');
const log = (msg) => {
    const timestamp = new Date().toISOString();
    const logMsg = `[${timestamp}] [Electron Main] ${msg}\n`;
    console.log(logMsg.trim());
    try {
        fs.appendFileSync(mainLogPath, logMsg);
    } catch (e) {
        // Fallback to console if file write fails
    }
};

let mainWindow;
let backendProcess;
let backendPort = 0;

// Path to backend
const BACKEND_PATH = isDev
    ? path.join(__dirname, '../backend/src/server.ts')
    : path.join(process.resourcesPath, 'backend/dist/server.js');

log(`App starting. UserData: ${userDataPath}`);
log(`DIAGNOSTIC: process.resourcesPath = ${process.resourcesPath}`);
log(`DIAGNOSTIC: __dirname = ${__dirname}`);
log(`DIAGNOSTIC: BACKEND_PATH = ${BACKEND_PATH}`);
log(`DIAGNOSTIC: BACKEND_PATH exists = ${fs.existsSync(BACKEND_PATH)}`);
if (BACKEND_PATH.includes('app.asar')) {
    log('WARNING: BACKEND_PATH contains app.asar! This is likely causing module issues.');
}

const FRONTEND_DIST_PATH = path.join(__dirname, '../frontend/dist');

function getFreePort() {
    return new Promise((resolve, reject) => {
        const server = require('net').createServer();
        server.listen(0, '127.0.0.1', () => { // Bind to 127.0.0.1
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', reject);
    });
}

function waitForBackend(port) {
    const http = require('http');
    const maxAttempts = 10;
    const interval = 1000;
    let attempts = 0;

    return new Promise((resolve, reject) => {
        const check = () => {
            attempts++;
            log(`Checking backend health (attempt ${attempts}/${maxAttempts})...`);

            const req = http.request({
                host: '127.0.0.1',
                port: port,
                path: '/health',
                timeout: 500
            }, (res) => {
                if (res.statusCode === 200) {
                    log('Backend is healthy!');
                    resolve();
                } else {
                    retry();
                }
            });

            req.on('error', () => retry());
            req.on('timeout', () => {
                req.destroy();
                retry();
            });
            req.end();
        };

        const retry = () => {
            if (attempts >= maxAttempts) {
                reject(new Error('Backend failed to start in time'));
            } else {
                setTimeout(check, interval);
            }
        };

        check();
    });
}

async function startBackend() {
    backendPort = await getFreePort();
    log(`Starting backend on port ${backendPort}...`);

    // Environment variables for the backend
    const env = {
        ...process.env,
        PORT: backendPort.toString(),
        NODE_ENV: isDev ? 'development' : 'production',
        LOGS_DIR: path.join(userDataPath, 'logs')
    };

    // In production, load .env from resources
    if (!isDev) {
        const envPath = path.join(process.resourcesPath, '.env');
        if (fs.existsSync(envPath)) {
            log(`Loading .env from ${envPath}`);
            const envConfig = require('dotenv').parse(fs.readFileSync(envPath));
            // Merge .env but PRIORITIZE our dynamic variables
            Object.assign(env, envConfig);
            env.PORT = backendPort.toString(); // Re-apply our dynamic port
            env.NODE_ENV = 'production';
        } else {
            log('No .env file found in resources');
        }

        // For SQLite, set DATABASE_URL to user data directory (writable location)
        const dbPath = path.join(userDataPath, 'database.db');
        log(`Database path: ${dbPath}`);

        // Run migrations in production
        try {
            // On Windows, use prisma.cmd, on others use prisma
            const isWin = process.platform === 'win32';
            const prismaBinary = isWin ? 'prisma.cmd' : 'prisma';
            const prismaPath = path.join(process.resourcesPath, 'backend/node_modules/.bin', prismaBinary);
            const schemaPath = path.join(process.resourcesPath, 'backend/src/prisma/schema.prisma');

            // Validate paths exist
            if (!fs.existsSync(prismaPath)) {
                log(`ERROR: Prisma binary not found at ${prismaPath}`);
            }
            if (!fs.existsSync(schemaPath)) {
                log(`ERROR: Schema not found at ${schemaPath}`);
            }

            log(`Running prisma migrations with binary: ${prismaPath}...`);
            // Simpler SQLite URL format for Windows to avoid 'os error 161'
            const connectionUrl = `file:${dbPath}`;
            env.DATABASE_URL = connectionUrl;

            require('child_process').execSync(`"${prismaPath}" migrate deploy --schema="${schemaPath}"`, {
                env: { ...env, DATABASE_URL: connectionUrl }
            });
            log('Migrations completed successfully');
        } catch (error) {
            log(`Migration error: ${error.message}`);
            if (error.stderr) log(`Migration stderr: ${error.stderr.toString()}`);
        }
    }

    if (isDev) {
        // In development, spawn with ts-node if available
        const tsNodePath = path.join(__dirname, '../backend/node_modules/ts-node-dev/bin/ts-node-dev');
        const backendSrcPath = path.join(__dirname, '../backend/src/server.ts');

        // Check if ts-node-dev exists, otherwise use regular node with compiled JS
        if (fs.existsSync(tsNodePath)) {
            backendProcess = fork(backendSrcPath, [], {
                env,
                execPath: process.execPath,
                execArgv: ['-r', 'ts-node/register']
            });
        } else {
            // Fallback to compiled JS
            backendProcess = fork(BACKEND_PATH, [], { env });
        }
    } else {
        backendProcess = fork(BACKEND_PATH, [], {
            env,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
        });

        // Pipe stdout/stderr to main log
        backendProcess.stdout.on('data', (data) => log(`[Backend STDOUT] ${data.toString().trim()}`));
        backendProcess.stderr.on('data', (data) => log(`[Backend STDERR] ${data.toString().trim()}`));
    }

    backendProcess.on('message', (msg) => {
        log(`Backend IPC message: ${JSON.stringify(msg)}`);
    });

    backendProcess.on('error', (err) => {
        log(`Backend process error: ${err}`);
    });

    // Wait for health check before resolving
    if (!isDev) {
        await waitForBackend(backendPort);
    }
}

function createWindow() {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;

    mainWindow = new BrowserWindow({
        width: width,
        height: height,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, 'assets/icon.ico') // TBD
    });

    if (isDev) {
        // connect to vite dev server
        mainWindow.loadURL('http://localhost:5173');
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(path.join(FRONTEND_DIST_PATH, 'index.html'));
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(async () => {
    // In development, backend is started by concurrently, so we just use the default port
    if (isDev) {
        backendPort = 5000;
        log('Development mode: Using backend on port 5000 (managed by concurrently)');
    } else {
        // In production, start the backend ourselves
        await startBackend();
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('will-quit', () => {
    if (backendProcess) {
        log('Killing backend process...');
        backendProcess.kill();
    }
});

// IPC to get port
ipcMain.handle('get-api-port', () => backendPort);
