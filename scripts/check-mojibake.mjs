import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SEARCH_DIRS = ["app", "lib"];
const FILE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".md", ".json"]);
const SUSPICIOUS_PATTERNS = [/�/g, /Ã/g, /Â/g, /ï¿½/g];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name === ".git") continue;
      walk(full, out);
      continue;
    }
    if (FILE_EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
  return out;
}

function findMatches(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (SUSPICIOUS_PATTERNS.some((pattern) => pattern.test(line))) {
      hits.push({ line: i + 1, text: line.trim() });
    }
    for (const pattern of SUSPICIOUS_PATTERNS) pattern.lastIndex = 0;
  }
  return hits;
}

const files = SEARCH_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));
const problems = [];

for (const file of files) {
  const hits = findMatches(file);
  if (hits.length > 0) {
    problems.push({ file, hits });
  }
}

if (problems.length > 0) {
  console.error("Mojibake/Encoding-Probleme gefunden:");
  for (const entry of problems) {
    const rel = path.relative(ROOT, entry.file);
    for (const hit of entry.hits) {
      console.error(`- ${rel}:${hit.line} -> ${hit.text}`);
    }
  }
  process.exit(1);
}

console.log("Keine Mojibake/Encoding-Probleme gefunden.");
