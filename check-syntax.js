// check-syntax.js - ES Module syntax checker
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function checkDir(dir) {
  let errors = 0;
  if (!fs.existsSync(dir)) return errors;
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== "node_modules" && entry.name !== ".git") {
      errors += checkDir(full);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      try {
        execSync("node -c \"" + full + "\"", { stdio: "pipe" });
      } catch (err) {
        console.error("❌ Syntax error in:", full);
        console.error(err.stderr.toString());
        errors++;
      }
    }
  }
  return errors;
}

console.log("🔍 Checking all JavaScript files across the project...");
const totalErrors = checkDir(path.join(__dirname, "apps/web-lab"));

if (totalErrors === 0) {
  console.log("✅ All JavaScript files are 100% valid. No syntax errors found!");
  process.exit(0);
} else {
  console.error("❌ Found " + totalErrors + " syntax error(s).");
  process.exit(1);
}
