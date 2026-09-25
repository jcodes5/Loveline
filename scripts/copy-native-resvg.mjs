import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const requireLocal = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dest = path.join(root, "dist", "server", "native");

await fs.mkdir(dest, { recursive: true });

let resvgRoot;
try {
  const mainPkgJson = requireLocal.resolve("@resvg/resvg-js/package.json");
  resvgRoot = await fs.realpath(path.dirname(mainPkgJson));
} catch {
  console.log("Skipping native resvg copy: @resvg/resvg-js is not installed.");
  process.exit(0);
}

// In pnpm's virtual store the platform packages are siblings of the main
// package (e.g. .pnpm/@resvg+resvg-js@2.6.2/node_modules/@resvg/), never nested
// inside it — so candidate bases must include resvgRoot's parent container.
const candidateBases = [
  path.dirname(resvgRoot),
  path.join(resvgRoot, "node_modules", "@resvg"),
  path.join(root, "node_modules", "@resvg"),
];

// Also scan the pnpm virtual store directly for linux-x64 platform packages
// (layout: .pnpm/@resvg+resvg-js-linux-x64-gnu@2.6.2/node_modules/@resvg/...)
try {
  const pnpmDir = path.join(root, "node_modules", ".pnpm");
  for (const entry of await fs.readdir(pnpmDir)) {
    if (!entry.startsWith("@resvg+resvg-js-linux-x64-")) continue;
    candidateBases.push(path.join(pnpmDir, entry, "node_modules", "@resvg"));
  }
} catch {
  // Not a pnpm install (or virtual store absent); sibling/hoisted bases still apply.
}

const copied = [];
const seen = new Set();

for (const base of candidateBases) {
  let entries;
  try {
    entries = await fs.readdir(base);
  } catch {
    continue;
  }
  for (const name of entries) {
    if (!name.endsWith("-gnu") && !name.endsWith("-musl")) continue;
    if (!name.startsWith("resvg-js-linux-x64-")) continue;
    let files;
    try {
      files = await fs.readdir(path.join(base, name));
    } catch {
      continue;
    }
    const nodeFile = files.find((file) => file.endsWith(".node"));
    if (!nodeFile) continue;
    const triple = name.slice("resvg-js-".length);
    const outName = `resvgjs.${triple}.node`;
    if (seen.has(outName)) continue;
    seen.add(outName);
    await fs.copyFile(path.join(base, name, nodeFile), path.join(dest, outName));
    copied.push(outName);
  }
}

if (copied.length > 0) {
  console.log(`Copied native resvg bindings to ${dest}: ${copied.join(", ")}`);
} else if (process.platform === "linux") {
  console.error(
    "ERROR: no linux-x64 resvg binding was found while building on Linux; " +
      "quote-card rendering will fail on the deployed function. " +
      "Make sure @resvg/resvg-js-linux-x64-gnu and/or -musl are installed (pnpm install).",
  );
  process.exit(1);
} else {
  console.log("No linux-x64 resvg binding available locally; skipping (expected on non-Linux dev machines).");
}