# Changelog

## 1.1.19 - 2026-10-14

### Changed
- audit.cjs moved to scripts/.
- mauritania test moved to tests/; the test runner now also finds .js tests in tests/ (6 more tests run).
- Removed stale test.mjs.

## 1.1.18 - 2026-10-14

### Fixed
- Transpiler no longer adds double parentheses around conditions: if (true) stays if (true).
- Transpiler output is trimmed (no leading space).
- tunisia_franco.json now follows the standard dialect schema (code, name, script, keywords), so the audit check passes.
- CLI test now uses real Tunisian Franco words (ken, goul, wella).

### Added
- Tunisian Franco REPL (toulma + goul fixed).
- Franco dialect data (Tunisian and Algerian).
- CONTRIBUTING guide, CODEOWNERS, branch protection and the Check Dialect audit.
- README: Install, Quick start, license badge and Franco dialect codes (tn-latn, dz-latn).

### Changed
- Images moved to docs/.
- Removed test leftover files; out.js and test-*.bayda are now ignored.

## 1.1.17
- Release 1.1.17.
