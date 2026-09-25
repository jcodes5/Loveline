import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "server", "fonts");
const dest = path.join(root, "dist", "server", "fonts");

await fs.mkdir(dest, { recursive: true });
for (const file of await fs.readdir(src)) {
  await fs.copyFile(path.join(src, file), path.join(dest, file));
}
console.log(`Copied quote card fonts to ${dest}`);