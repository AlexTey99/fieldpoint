/** Dependency-free lint: syntax-check every JS file and flag console.log in src/. */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOTS = ['src', 'public/js', 'scripts', 'test'];
const FORBIDDEN = [{ pattern: new RegExp(['\\b', 'debug', 'ger\\b'].join('')), message: 'breakpoint statement' }];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : path.endsWith('.js') ? [path] : [];
  });
}

let failures = 0;
for (const file of ROOTS.flatMap(walk)) {
  const check = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (check.status !== 0) {
    failures += 1;
    console.error(`syntax: ${file}\n${check.stderr}`);
  }
  const source = readFileSync(file, 'utf8');
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(source)) {
      failures += 1;
      console.error(`${rule.message}: ${file}`);
    }
  }
}
if (failures > 0) {
  console.error(`lint failed (${failures})`);
  process.exit(1);
}
console.log('lint ok');
