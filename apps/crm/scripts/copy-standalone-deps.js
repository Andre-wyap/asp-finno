#!/usr/bin/env node
/**
 * Postbuild: makes the standalone output runnable on App Hosting / Cloud Run.
 *
 * Why: outputFileTracingRoot is set to __dirname so server.js stays at
 * .next/standalone/server.js (where the App Hosting adapter expects it).
 * The trade-off is that node_modules above the tracing root are not copied
 * into standalone/node_modules, so Cloud Run can't `require('next')`.
 *
 * App Hosting's bundle.yaml only includes .next/standalone in the container
 * image, so we copy the runtime deps INTO standalone/node_modules ourselves.
 *
 * Step 1: strip `file:` workspace deps from standalone/package.json
 *   (workspace packages are bundled by webpack and not needed at runtime).
 * Step 2: copy each non-file dep from the repo-root node_modules into
 *   standalone/node_modules so the container has the runtime tree it needs.
 */

const fs = require('fs');
const path = require('path');

const appDir = path.join(__dirname, '..');
const standaloneDir = path.join(appDir, '.next/standalone');
const pkgPath = path.join(standaloneDir, 'package.json');
const repoRoot = path.join(appDir, '../..');
const repoNodeModules = path.join(repoRoot, 'node_modules');
const standaloneNodeModules = path.join(standaloneDir, 'node_modules');

if (!fs.existsSync(pkgPath)) {
  console.error('[postbuild] standalone/package.json not found — was next build run?');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
const runtimeDeps = [];
for (const [name, ver] of Object.entries(pkg.dependencies || {})) {
  if (typeof ver === 'string' && ver.startsWith('file:')) {
    delete pkg.dependencies[name];
    console.log(`[postbuild] Removed workspace dep: ${name}`);
  } else {
    runtimeDeps.push(name);
  }
}
delete pkg.devDependencies;
delete pkg.peerDependencies;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');

fs.mkdirSync(standaloneNodeModules, { recursive: true });

const copied = new Set();
function copyDep(name) {
  if (copied.has(name)) return;
  const src = path.join(repoNodeModules, name);
  if (!fs.existsSync(src)) {
    console.warn(`[postbuild] WARNING: ${name} not found in repo root node_modules`);
    return;
  }
  const dest = path.join(standaloneNodeModules, name);
  if (fs.existsSync(dest)) {
    copied.add(name);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, dereference: true });
  copied.add(name);

  // Recursively copy this package's own dependencies
  const depPkgPath = path.join(src, 'package.json');
  if (fs.existsSync(depPkgPath)) {
    try {
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
      const transitive = Object.keys(depPkg.dependencies || {});
      for (const t of transitive) {
        copyDep(t);
      }
      for (const [t, optional] of Object.entries(depPkg.optionalDependencies || {})) {
        copyDep(t);
      }
    } catch (e) {
      // ignore malformed package.json
    }
  }
}

for (const name of runtimeDeps) {
  copyDep(name);
}

console.log(`[postbuild] Copied ${copied.size} packages into standalone/node_modules`);
