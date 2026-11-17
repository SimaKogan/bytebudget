<h1 align="center">📦 bytebudget</h1>

<p align="center">
  <b>Keep your JavaScript within a size budget.</b><br>
  Measures raw, gzip and brotli size, fails your CI when a bundle grows too much,<br>
  and draws a pretty report. Zero dependencies.
</p>

<p align="center">
  <a href="https://github.com/SimaKogan/bytebudget/actions"><img alt="CI" src="https://github.com/SimaKogan/bytebudget/actions/workflows/ci.yml/badge.svg"></a>
  <img alt="license" src="https://img.shields.io/badge/license-MIT-blue">
  <img alt="node" src="https://img.shields.io/badge/node-%E2%89%A516-brightgreen">
  <img alt="dependencies" src="https://img.shields.io/badge/dependencies-0-success">
</p>

```text
  bytebudget · JavaScript size budgets

  ✖ main         gzip   ████████████████████ 101%  8.1 kB / 8 kB
    Over the limit by 94 B (1 file, 52.1 kB raw)
  ✔ vendor       brotli ███████████████░░░░░  73%  22 kB / 30 kB
  ✖ admin        gzip   ████████████████████ 134%  13.4 kB / 10 kB
```

## Why

Bundles grow one small dependency at a time. A budget turns "the site feels slower"
into a failing check on the pull request that caused it.

## Quick start

```bash
npm install --save-dev bytebudget
npx bytebudget --init          # creates bytebudget.config.json
npx bytebudget                 # run the check
```

## Configuration

Either `bytebudget.config.json` or a `"bytebudget"` key in `package.json`:

```json
{
  "budgets": [
    { "name": "App",    "path": "dist/app.*.js",  "limit": "50 kB", "mode": "gzip" },
    { "name": "Vendor", "path": "dist/vendor.js", "limit": "120 kB", "mode": "brotli" }
  ]
}
```

| Field   | Description                                                                 |
| ------- | --------------------------------------------------------------------------- |
| `name`  | Label in the report (defaults to the path).                                 |
| `path`  | File, glob (`*`, `**`, `?`) or a list of them, relative to the project.     |
| `limit` | `"10 kB"`, `"1.5 MB"`, `"2 KiB"` or a number of bytes.                      |
| `mode`  | `raw`, `gzip` (default) or `brotli`.                                        |

Matched files are concatenated before compression, which is close to what the browser downloads.

## CLI

```text
bytebudget [options]

  -c, --config <file>   Use a specific JSON config file
      --json            Print results as JSON
      --html <file>     Also write a self-contained HTML report
      --save-baseline <file>  Save current sizes as a baseline snapshot
      --compare <file>        Show the change against a saved baseline
      --markdown <file>       Write a Markdown report (for pull request comments)
      --init            Create bytebudget.config.json
      --no-color        Disable coloured output
```

Exit codes: `0` passed · `1` budget exceeded · `2` configuration error.

## HTML report

```bash
npx bytebudget --html report.html
```

A single self-contained file with light and dark themes. Upload it as a CI artifact.

## Compare with the previous version

Save a snapshot on the base branch, then compare on the pull request:

```bash
npx bytebudget --save-baseline baseline.json          # on main
npx bytebudget --compare baseline.json                # on the PR
```

```text
  ✖ main    gzip   ████████████████████ 109%  8.7 kB / 8 kB  +590 B
  ✔ vendor  brotli ███████████████░░░░░  73%  22 kB / 30 kB  ±0
```

Add `--markdown comment.md` to get a table ready for a pull request comment, and `--html`
to see the change inside the report. Budgets are matched by `name`; a budget with no match
(or a different `mode`) is shown as `new`.

### Pull request comment

[`examples/ci/bytebudget-pr.yml`](./examples/ci/bytebudget-pr.yml) is a ready workflow:
it builds the base branch and the PR, compares them and keeps one up-to-date comment
on the pull request, then fails the check if a budget is exceeded.
Copy it to `.github/workflows/` and adjust the build command.

## GitHub Actions

```yaml
- run: npm ci && npm run build
- run: npx bytebudget --html report.html
- uses: actions/upload-artifact@v4
  if: always()
  with: { name: bytebudget-report, path: report.html }
```

## Programmatic use

```js
const { run } = require('bytebudget')
const { results, passed } = run(process.cwd())
```

## Development

```bash
npm test         # node:test, no dependencies needed
npm run demo     # runs the example config and writes examples/report.html
```

## License

[MIT](./LICENSE) © Sima Kogan
