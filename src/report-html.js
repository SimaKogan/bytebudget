'use strict'

const { formatSize } = require('./size')
const { formatDelta } = require('./compare')

function esc(s) {
  return String(s).replace(/[&<>"']/g, ch => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]
  ))
}

function card(r) {
  const state = !r.passed ? 'fail' : r.ratio > 0.85 ? 'warn' : 'ok'
  const pct = Number.isFinite(r.ratio) ? Math.round(r.ratio * 100) : 999
  const width = Math.min(100, pct)
  const label = { ok: 'Within budget', warn: 'Close to limit', fail: 'Over budget' }[state]
  const files = r.files.map(f => `<li>${esc(f)}</li>`).join('')
  return `
    <article class="card ${state}">
      <header>
        <h2>${esc(r.name)}</h2>
        <span class="badge">${label}</span>
      </header>
      <div class="numbers">
        <strong>${formatSize(r.size)}</strong>
        <span>of ${formatSize(r.limit)} · ${esc(r.mode)}</span>
        ${r.delta === undefined ? '' : `<span class="delta ${r.delta > 0 ? 'up' : r.delta < 0 ? 'down' : ''}">${esc(formatDelta(r))} vs baseline</span>`}
      </div>
      <div class="track" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100">
        <div class="fill" style="width:${width}%"></div>
      </div>
      <p class="meta">${pct}% used · ${formatSize(r.rawSize)} raw · ${r.files.length} file${r.files.length === 1 ? '' : 's'}</p>
      <details><summary>Files</summary><ul>${files}</ul></details>
    </article>`
}

/**
 * Self-contained HTML report (no external requests), light and dark aware.
 */
function renderHtml({ results, passed }, { title = 'bytebudget report', date = new Date() } = {}) {
  const failing = results.filter(r => !r.passed).length
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  :root {
    --bg: #f6f7fb; --panel: #ffffff; --text: #151826; --muted: #666d85;
    --line: #e3e6f0; --ok: #12a05c; --warn: #d98b00; --fail: #e03a4e;
    --accent1: #6d5efc; --accent2: #22c1c3;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #0d0f1a; --panel: #161a2b; --text: #eef0fa; --muted: #9aa1bd;
      --line: #262b45; --ok: #3ddc97; --warn: #ffb547; --fail: #ff6b7d;
    }
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    background: var(--bg); color: var(--text);
  }
  .hero {
    padding: 56px 16px 72px; text-align: center; color: #fff;
    background: linear-gradient(135deg, var(--accent1), var(--accent2));
  }
  .hero h1 { margin: 0 0 8px; font-size: clamp(28px, 6vw, 44px); letter-spacing: -0.02em; }
  .hero p { margin: 0; opacity: .9; }
  .status {
    display: inline-block; margin-top: 20px; padding: 6px 16px; border-radius: 999px;
    background: rgba(255,255,255,.2); font-weight: 600;
  }
  main { max-width: 860px; margin: -40px auto 48px; padding: 0 16px; display: grid; gap: 16px; }
  .card {
    background: var(--panel); border: 1px solid var(--line); border-radius: 16px;
    padding: 20px 22px; box-shadow: 0 8px 30px rgba(20, 24, 60, .08);
    border-left: 6px solid var(--ok);
  }
  .card.warn { border-left-color: var(--warn); }
  .card.fail { border-left-color: var(--fail); }
  .card header { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
  .card h2 { margin: 0; font-size: 18px; overflow-wrap: anywhere; }
  .badge { font-size: 12px; font-weight: 700; padding: 3px 10px; border-radius: 999px; white-space: nowrap;
    color: var(--ok); background: color-mix(in srgb, var(--ok) 15%, transparent); }
  .warn .badge { color: var(--warn); background: color-mix(in srgb, var(--warn) 15%, transparent); }
  .fail .badge { color: var(--fail); background: color-mix(in srgb, var(--fail) 15%, transparent); }
  .numbers { margin: 14px 0 10px; display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap; }
  .numbers strong { font-size: 30px; letter-spacing: -0.02em; }
  .numbers span, .meta { color: var(--muted); }
  .numbers .delta { font-weight: 600; margin-left: auto; }
  .numbers .delta.up { color: var(--fail); }
  .numbers .delta.down { color: var(--ok); }
  .track { height: 10px; border-radius: 999px; background: var(--line); overflow: hidden; }
  .fill { height: 100%; border-radius: 999px; background: var(--ok); }
  .warn .fill { background: var(--warn); }
  .fail .fill { background: var(--fail); }
  .meta { margin: 10px 0 0; font-size: 14px; }
  details { margin-top: 10px; color: var(--muted); font-size: 14px; }
  summary { cursor: pointer; }
  ul { margin: 8px 0 0; padding-left: 20px; font-family: ui-monospace, Menlo, Consolas, monospace; }
  footer { text-align: center; color: var(--muted); font-size: 13px; padding: 0 16px 32px; }
</style>
</head>
<body>
  <section class="hero">
    <h1>bytebudget</h1>
    <p>JavaScript size budgets</p>
    <div class="status">${passed ? '✔ All budgets passed' : `✖ ${failing} of ${results.length} over budget`}</div>
  </section>
  <main>${results.map(card).join('')}
  </main>
  <footer>Generated ${esc(date.toISOString())}</footer>
</body>
</html>
`
}

module.exports = { renderHtml }
