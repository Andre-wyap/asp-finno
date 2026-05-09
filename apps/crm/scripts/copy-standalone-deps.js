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
const queue = [];

// Walk a package's package.json + every nested node_modules/<pkg>/package.json
// and enqueue all referenced names. Nested node_modules are critical: when
// npm hoists differently across packages, sub-packages bring their own copy
// of a dep with its own peer/transitive chain (e.g. google-gax's nested
// google-auth-library requires gtoken from the standalone root).
function enqueueFromPackageDir(packageDir) {
  const depPkgPath = path.join(packageDir, 'package.json');
  if (fs.existsSync(depPkgPath)) {
    try {
      const depPkg = JSON.parse(fs.readFileSync(depPkgPath, 'utf8'));
      for (const t of Object.keys(depPkg.dependencies || {})) queue.push(t);
      for (const t of Object.keys(depPkg.optionalDependencies || {})) queue.push(t);
    } catch {
      // ignore malformed package.json
    }
  }
  // Recurse into nested node_modules
  const nestedNm = path.join(packageDir, 'node_modules');
  if (fs.existsSync(nestedNm)) {
    for (const entry of fs.readdirSync(nestedNm)) {
      if (entry.startsWith('.')) continue;
      if (entry.startsWith('@')) {
        const scopedDir = path.join(nestedNm, entry);
        for (const sub of fs.readdirSync(scopedDir)) {
          enqueueFromPackageDir(path.join(scopedDir, sub));
        }
      } else {
        enqueueFromPackageDir(path.join(nestedNm, entry));
      }
    }
  }
}

function copyDep(name) {
  if (copied.has(name)) return;
  const src = path.join(repoNodeModules, name);
  if (!fs.existsSync(src)) {
    console.warn(`[postbuild] WARNING: ${name} not found in repo root node_modules`);
    copied.add(name); // don't retry
    return;
  }
  const dest = path.join(standaloneNodeModules, name);
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true, dereference: true });
  }
  copied.add(name);
  enqueueFromPackageDir(src);
}

queue.push(...runtimeDeps);
while (queue.length) {
  copyDep(queue.shift());
}

console.log(`[postbuild] Copied ${copied.size} packages into standalone/node_modules`);
