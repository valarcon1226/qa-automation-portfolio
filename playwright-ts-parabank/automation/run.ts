import * as path from 'path';
import { BillPayBatchRunner, RunnerOptions } from './billPayRunner';

function parseArgs(): RunnerOptions {
  const args = process.argv.slice(2);
  const options: RunnerOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--records' && args[i + 1]) {
      options.recordsPath = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--state' && args[i + 1]) {
      options.statePath = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--summary' && args[i + 1]) {
      options.summaryPath = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--rejected' && args[i + 1]) {
      options.rejectedPath = path.resolve(process.cwd(), args[++i]);
    } else if (arg === '--retries' && args[i + 1]) {
      options.maxRetries = parseInt(args[++i], 10);
    } else if (arg === '--headed') {
      options.headless = false;
    } else if (arg === '--headless') {
      options.headless = true;
    } else if (!arg.startsWith('-') && !options.recordsPath) {
      options.recordsPath = path.resolve(process.cwd(), arg);
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseArgs();
  const runner = new BillPayBatchRunner(options);

  try {
    const summary = await runner.run();
    if (summary.failed > 0) {
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('[BillPayRunner] Fatal unhandled error:', err);
    process.exitCode = 2;
  }
}

void main();
