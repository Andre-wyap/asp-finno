#!/usr/bin/env node
/**
 * Postbuild: fixes the standalone output so it can be deployed by App Hosting.
 *
 * Problem: outputFileTracingRoot is set to __dirname (apps/web/) so that the
 * standalone's server.js stays at the root level (required by the App Hosting
 * adapter). The trade-off is that node_modules above the tracing root (i.e.,
 * the repo root's node_modules) are not copied into standalone/node_modules.
 *
 * Fix: strip workspace file: paths from standalone/package.json so that
 * Cloud Run npm install succeeds and installs the full packages (next, react,
 * firebase-admin, etc.) into the container image.
 *
 * The workspace packages (@asp/pricing, @asp/shared) are compiled into the
 * Next.js webpack bundle at build time and are not needed at runtime.
 */

const fs = require('fs');
const path = require('path');

const standaloneDir = path.join(__dirname, '../.next/standalone');
const pkgPath = path.join(standaloneDir, 'package.json');

if (!fs.existsSync(pkgPath)) {
  console.error('[postbuild] standalone/package.json not found — was next build run?');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
let modified = false;
for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
  if (!pkg[field]) continue;
  for (const [name, ver] of Object.entries(pkg[field])) {
    if (typeof ver === 'string' && ver.startsWith('file:')) {
      delete pkg[field][name];
      modified = true;
      console.log(`[postbuild] Removed workspace dep: ${name}`);
    }
  }
}

if (modified) {
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log('[postbuild] standalone/package.json updated.');
} else {
  console.log('[postbuild] No workspace deps found — standalone/package.json unchanged.');
}
