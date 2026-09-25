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

const candidateBases = [
  path.join(resvgRoot, "node_modules", "@resvg"),
  path.join(root, "node_modules", "@resvg"),
];

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
} else {
  console.log("No linux-x64 resvg binding available locally; skipping (expected on non-Linux dev machines).");
}