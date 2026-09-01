# Vendored browser dependency

## SheetJS CE

- Version: `0.20.3`
- Package source: pinned in `package.json` and `package-lock.json`
- Build output: `dist/vendor/xlsx.full.min.js`
- Source: `https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js`
- SHA-256: `cc015130aa8521e7f088f88898eba949ccdcbfb38df0bd129b44b7273c3a6f41`
- License: Apache License 2.0, copied to `dist/vendor/LICENSE.sheetjs.txt` during build

The locked install supplies the browser build. SAMSON then publishes it from its own
origin so `.xlsx`, `.xls`, and `.csv` parsing does not require a third-party runtime
script origin in the Content Security Policy.
