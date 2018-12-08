'use strict';

const debug = require('debug')('sc2:debug:launcher');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const findP = require('find-process');

const EXECUTE_INFO_PATH = path.join('Documents', 'StarCraft II', 'ExecuteInfo.txt');
const HOME_DIR = os.homedir();

const executeInfoText = fs.readFileSync(path.join(HOME_DIR, EXECUTE_INFO_PATH)).toString();
const executablePath = executeInfoText.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/m)[2];

const parsedPath = executablePath.split('\\');
const execName = parsedPath[parsedPath.length - 1];

const basePath = parsedPath.slice(0, parsedPath.findIndex(s => s === 'StarCraft II') + 1).join(path.sep);

/** @type {Launcher} */
async function launcher(options) {
    const opts = {
        listen: '127.0.0.1',
        port: 5000,
        displayMode: 0,
        force: false,
        killAll: false,
        ...options,
    };

    const [samePortProcess] = await findP('port', opts.port);
    if (samePortProcess) {
        debug('Existing process found running on same port: %o', samePortProcess);

        if (options.force) {
            debug('"Force" enabled, killing process to restart...');
            if (samePortProcess.pid) {
                process.kill(samePortProcess.pid, 'SIGKILL');
            }
            // parent can also be killed using the `ppid` prop.. but don't see a need for that atm
        } else {
            debug('Skipping launch since the client already exists listening on this port (set { force: true } in options if you want to force restart it)');
            return samePortProcess.pid;
        }
    }

    const existingProcesses = await findP('name', execName, true);
    if (existingProcesses.length > 0) {
        debug(`Existing ${execName} processes found running: %o`, existingProcesses);

        if (options.forceAll) {
            debug(`ForceAll" enabled, killing *all* ${execName} processes before launching...`);

            existingProcesses.forEach((proc) => {
                if (proc.pid) {
                    process.kill(proc.pid, 'SIGKILL');
                }
                // parent can also be killed using the `ppid` prop.. but don't see a need for that atm
            });
        } else {
            debug('Not killing existing clients running on a different port, (set { forceAll: true } in options if you want this behavior)');
        }
    } else {
        debug('no existing processes');
    }

    debug('Launching new process...');
    const clientProcess = spawn(executablePath, [
        '-listen', opts.listen,
        '-port', String(opts.port),
        '-displayMode', String(opts.displayMode)
    ], {
        cwd: path.join(basePath, 'Support64'),
        detached: true,
        stdio: 'ignore',
    });

    // don't try this at home kids...
    debug(`Waiting for new process to start listening on port ${opts.port}...`);
    while({ pid: 0, ...(await findP('port', opts.port))[0] }.pid !== clientProcess.pid);
    debug('New client is up and running successfully');

    clientProcess.unref();
    return clientProcess;
}

module.exports = launcher;