'use strict'

const { formatSize } = require('./size')
const { formatDelta } = require('./compare')

function makeColors(enabled) {
  const wrap = code => s => (enabled ? `\u001b[${code}m${s}\u001b[0m` : String(s))
  return {
    bold: wrap('1'),
    dim: wrap('2'),
    red: wrap('31'),
    green: wrap('32'),
    yellow: wrap('33'),
    cyan: wrap('36')
  }
}

function bar(ratio, width, c) {
  const filled = Math.min(width, Math.round(Math.min(ratio, 1) * width))
  const paint = ratio > 1 ? c.red : ratio > 0.85 ? c.yellow : c.green
  return paint('█'.repeat(filled)) + c.dim('░'.repeat(width - filled))
}

/**
 * Render results as a coloured terminal report.
 */
function renderCli({ results, passed }, { color = false } = {}) {
  const c = makeColors(color)
  const nameWidth = Math.max(...results.map(r => r.name.length), 4)
  const lines = ['', `  ${c.bold('bytebudget')} ${c.dim('· JavaScript size budgets')}`, '']

  for (const r of results) {
    const icon = r.passed ? c.green('✔') : c.red('✖')
    const pct = Number.isFinite(r.ratio) ? `${Math.round(r.ratio * 100)}%` : '∞'
    const sizes = `${formatSize(r.size)} / ${formatSize(r.limit)}`
    let delta = ''
    if (r.delta !== undefined) {
      const text = formatDelta(r)
      const paint = r.delta > 0 ? c.red : r.delta < 0 ? c.green : c.dim
      delta = `  ${paint(text)}`
    }
    lines.push(
      `  ${icon} ${c.bold(r.name.padEnd(nameWidth))}  ${c.cyan(r.mode.padEnd(6))} ` +
        `${bar(r.ratio, 20, c)} ${pct.padStart(4)}  ${sizes}${delta}`
    )
    if (!r.passed) {
      lines.push(
        `    ${c.red(`Over the limit by ${formatSize(r.size - r.limit)}`)} ` +
          c.dim(`(${r.files.length} file${r.files.length === 1 ? '' : 's'}, ${formatSize(r.rawSize)} raw)`)
      )
    }
  }

  lines.push('')
  lines.push(
    passed ? `  ${c.green('All budgets passed.')}` : `  ${c.red('Budget exceeded.')}`
  )
  lines.push('')
  return lines.join('\n')
}

module.exports = { renderCli }
