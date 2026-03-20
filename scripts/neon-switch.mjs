#!/usr/bin/env node
/**
 * scripts/neon-switch.mjs
 *
 * Fetches Neon connection strings for the given branch and writes
 * DATABASE_URL / DIRECT_URL into .env and .env.local.
 *
 * Usage:
 *   node scripts/neon-switch.mjs development
 *   node scripts/neon-switch.mjs production
 *
 * npm shortcuts:
 *   npm run db:use:dev
 *   npm run db:use:prod
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const PROJECT_ID = 'flat-hill-73561129';

const branch = process.argv[2];
if (!branch) {
  console.error('Usage: node scripts/neon-switch.mjs <branch>');
  console.error('  branch: development | production');
  process.exit(1);
}

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8' }).trim();
}

console.log(`\nFetching Neon connection strings for branch: ${branch} ...`);

let pooledUrl, directUrl;
try {
  pooledUrl = run(
    `npx neonctl connection-string ${branch} --project-id ${PROJECT_ID} --pooled`,
  );
  directUrl = run(
    `npx neonctl connection-string ${branch} --project-id ${PROJECT_ID}`,
  );
} catch (err) {
  console.error(`\nFailed to fetch connection strings from Neon.`);
  console.error(err.message);
  process.exit(1);
}

// Mask password for logging
const mask = (url) => url.replace(/:([^:@]+)@/, ':***@');
console.log(`  DATABASE_URL → ${mask(pooledUrl)}`);
console.log(`  DIRECT_URL   → ${mask(directUrl)}`);

function updateEnvFile(filePath) {
  if (!existsSync(filePath)) return;

  let content = readFileSync(filePath, 'utf8');

  if (/^DATABASE_URL=/m.test(content)) {
    content = content.replace(/^DATABASE_URL=.*/m, `DATABASE_URL="${pooledUrl}"`);
  } else {
    content += `\nDATABASE_URL="${pooledUrl}"`;
  }

  if (/^DIRECT_URL=/m.test(content)) {
    content = content.replace(/^DIRECT_URL=.*/m, `DIRECT_URL="${directUrl}"`);
  } else {
    content += `\nDIRECT_URL="${directUrl}"`;
  }

  writeFileSync(filePath, content, 'utf8');
  console.log(`  Wrote ${filePath.replace(ROOT + '\\', '').replace(ROOT + '/', '')}`);
}

updateEnvFile(resolve(ROOT, '.env'));
updateEnvFile(resolve(ROOT, '.env.local'));

console.log(`\nActive Neon branch: ${branch}`);
if (branch === 'production') {
  console.log('  ⚠  You are now pointed at PRODUCTION.');
  console.log('  Only run `npm run db:push` when promoting a validated schema change.');
} else {
  console.log('  Run `npm run db:push` to sync schema, or `npm run dev` to start the app.');
}
