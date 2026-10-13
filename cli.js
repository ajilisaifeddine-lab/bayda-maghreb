#!/usr/bin/env node
import fs from "node:fs";
import { transpile } from "./index.js";

const [file, dialect] = process.argv.slice(2);
if (!file) {
  console.error("usage: bayda <file> [dialect]");
  process.exit(1);
}
console.log(transpile(fs.readFileSync(file, "utf8"), dialect));
