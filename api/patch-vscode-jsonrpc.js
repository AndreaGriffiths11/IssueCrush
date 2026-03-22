// Patch vscode-jsonrpc to add ESM-compatible exports.
// The @github/copilot-sdk imports "vscode-jsonrpc/node" and "vscode-jsonrpc/node.js"
// but vscode-jsonrpc@8 has no "exports" field, so ESM resolution fails.
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname, relative } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function patchPackage(pkgDir) {
  const pkgPath = join(pkgDir, 'package.json');
  if (!existsSync(pkgPath)) return false;

  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  if (pkg.exports) return false; // already has exports

  pkg.exports = {
    '.': { types: './lib/common/api.d.ts', default: './lib/common/api.js' },
    './node': { types: './lib/node/main.d.ts', default: './lib/node/main.js' },
    './node.js': { types: './lib/node/main.d.ts', default: './lib/node/main.js' },
    './browser': { types: './lib/browser/main.d.ts', default: './lib/browser/main.js' },
  };
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

// Patch wherever vscode-jsonrpc lives relative to this script's location
const candidates = [
  join(__dirname, 'node_modules', 'vscode-jsonrpc'),
  join(__dirname, 'node_modules', '@github', 'copilot-sdk', 'node_modules', 'vscode-jsonrpc'),
];

for (const dir of candidates) {
  if (patchPackage(dir)) {
    console.log(`  ✅ Patched vscode-jsonrpc exports in ${relative(process.cwd(), dir)}`);
  }
}
