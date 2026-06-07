import fs from "node:fs";
import path from "node:path";

const candidates = [
  path.resolve("artifacts/smart-borrowing/dist/public"),
  path.resolve("dist/public"),
];

const output = path.resolve("public");
const source = candidates.find((candidate) => fs.existsSync(candidate));

if (!source) {
  console.error("Smart Borrowing build output not found.");
  console.error("Checked paths:");
  for (const candidate of candidates) console.error("-", candidate);
  process.exit(1);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
fs.cpSync(source, output, { recursive: true });

console.log(`Copied Smart Borrowing output from ${source} to ${output}`);
