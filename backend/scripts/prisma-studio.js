const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');

const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
const defaultArgs = ['--port', '5555', '--browser', 'none'];
const rawArgs = process.argv.length > 2 ? process.argv.slice(2) : defaultArgs;

// Prisma Studio logs aborted browser requests as stream errors; keep other errors visible.
const benignStudioStreamErrors = new Set([
  'ERR_STREAM_UNABLE_TO_PIPE',
  'ERR_STREAM_PREMATURE_CLOSE',
  'ERR_STREAM_DESTROYED',
]);
const signalExitCodes = {
  SIGINT: 130,
  SIGTERM: 143,
};

let suppressingBenignError = false;
let suppressingLinesLeft = 0;
let stderrBuffer = '';
let child;

function getPackageVersion(packageName) {
  return require(path.join(__dirname, '..', 'node_modules', packageName, 'package.json')).version;
}

function ensureMatchingPrismaVersions() {
  const prismaVersion = getPackageVersion('prisma');
  const clientVersion = getPackageVersion('@prisma/client');
  const prismaMajor = prismaVersion.split('.')[0];
  const clientMajor = clientVersion.split('.')[0];

  if (prismaMajor !== clientMajor) {
    process.stderr.write(
      [
        `Prisma CLI ${prismaVersion} does not match @prisma/client ${clientVersion}.`,
        'Run: npm install prisma@7.8.0',
      ].join('\n') + '\n',
    );
    process.exit(1);
  }
}

function getRequestedPort(args) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if ((arg === '--port' || arg === '-p') && args[index + 1]) {
      return Number(args[index + 1]);
    }
    if (arg.startsWith('--port=')) {
      return Number(arg.slice('--port='.length));
    }
  }

  return 5555;
}

function withPort(args, port) {
  const nextArgs = [...args];

  for (let index = 0; index < nextArgs.length; index += 1) {
    const arg = nextArgs[index];
    if (arg === '--port' || arg === '-p') {
      nextArgs[index + 1] = String(port);
      return nextArgs;
    }
    if (arg.startsWith('--port=')) {
      nextArgs[index] = `--port=${port}`;
      return nextArgs;
    }
  }

  return [...nextArgs, '--port', String(port)];
}

function canListenOnPort(port) {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close(() => {
        resolve(true);
      });
    });

    server.listen(port);
  });
}

async function resolveStudioArgs() {
  const requestedPort = getRequestedPort(rawArgs);

  if (!Number.isInteger(requestedPort) || requestedPort <= 0) {
    return ['studio', ...rawArgs];
  }

  for (let port = requestedPort; port < requestedPort + 20; port += 1) {
    if (await canListenOnPort(port)) {
      if (port !== requestedPort) {
        process.stderr.write(
          `Port ${requestedPort} is already in use. Starting Prisma Studio on ${port} instead.\n`,
        );
      }
      return ['studio', ...withPort(rawArgs, port)];
    }
  }

  process.stderr.write(
    `No available port found from ${requestedPort} to ${requestedPort + 19}.\n`,
  );
  process.exit(1);
}

function isBenignStudioStreamError(line) {
  return [...benignStudioStreamErrors].some((code) =>
    line.includes(`[Prisma Studio] Error [${code}]`),
  );
}

function writeFilteredStderr(text) {
  stderrBuffer += text;
  const lines = stderrBuffer.split(/\r?\n/);
  stderrBuffer = lines.pop() ?? '';

  for (const line of lines) {
    if (!suppressingBenignError && isBenignStudioStreamError(line)) {
      suppressingBenignError = true;
      suppressingLinesLeft = 40;
      continue;
    }

    if (suppressingBenignError) {
      suppressingLinesLeft -= 1;
      if (line.trim() === '}' || suppressingLinesLeft <= 0) {
        suppressingBenignError = false;
      }
      continue;
    }

    process.stderr.write(`${line}\n`);
  }
}

async function main() {
  ensureMatchingPrismaVersions();

  child = spawn(process.execPath, [prismaCli, ...(await resolveStudioArgs())], {
    cwd: path.join(__dirname, '..'),
    env: process.env,
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (chunk) => {
    process.stdout.write(chunk);
  });

  child.stderr.on('data', (chunk) => {
    writeFilteredStderr(chunk.toString());
  });

  child.on('error', (error) => {
    process.stderr.write(`Failed to start Prisma Studio: ${error.message}\n`);
    process.exitCode = 1;
  });

  child.on('exit', (code, signal) => {
    if (stderrBuffer && !suppressingBenignError) {
      process.stderr.write(stderrBuffer);
    }

    if (signal) {
      process.exit(signalExitCodes[signal] ?? 1);
    }

    process.exit(code ?? 0);
  });
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (child && !child.killed) {
      child.kill(signal);
    }
  });
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.message : error}\n`);
  process.exit(1);
});
