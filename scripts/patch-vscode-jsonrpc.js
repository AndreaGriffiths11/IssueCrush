// Patch vscode-jsonrpc to add ESM-compatible exports.
// The @github/copilot-sdk imports "vscode-jsonrpc/node" and "vscode-jsonrpc/node.js"
// but vscode-jsonrpc@8 has no "exports" field, so ESM resolution fails.
const fs = require('fs');
const path = require('path');

function patchPackage(pkgDir) {
  const pkgPath = path.join(pkgDir, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (pkg.exports) return false; // already has exports

  pkg.exports = {
    '.': { types: './lib/common/api.d.ts', default: './lib/common/api.js' },
    './node': { types: './lib/node/main.d.ts', default: './lib/node/main.js' },
    './node.js': { types: './lib/node/main.d.ts', default: './lib/node/main.js' },
    './browser': { types: './lib/browser/main.d.ts', default: './lib/browser/main.js' },
  };
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  return true;
}

// Patch wherever vscode-jsonrpc lives (could be hoisted or nested under copilot-sdk)
const candidates = [
  path.resolve(__dirname, '..', 'node_modules', 'vscode-jsonrpc'),
  path.resolve(__dirname, '..', 'node_modules', '@github', 'copilot-sdk', 'node_modules', 'vscode-jsonrpc'),
];

for (const dir of candidates) {
  if (patchPackage(dir)) {
    console.log(`  ✅ Patched vscode-jsonrpc exports in ${path.relative(process.cwd(), dir)}`);
  }
}
