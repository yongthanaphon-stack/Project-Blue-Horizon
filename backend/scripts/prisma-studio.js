const { spawn } = require('node:child_process');
const path = require('node:path');

const prismaCli = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js');
const defaultArgs = ['--port', '5555', '--browser', 'none'];
const args = ['studio', ...(process.argv.length > 2 ? process.argv.slice(2) : defaultArgs)];

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

const child = spawn(process.execPath, [prismaCli, ...args], {
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

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (!child.killed) {
      child.kill(signal);
    }
  });
}
