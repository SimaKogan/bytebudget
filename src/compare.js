'use strict'

const fs = require('fs')
const { formatSize } = require('./size')

const MARKER = '<!-- bytebudget-report -->'

/**
 * Turn a run outcome into a small baseline snapshot that can be stored
 * (as a file or CI artifact) and compared against later.
 */
function createBaseline(outcome) {
  const budgets = {}
  for (const r of outcome.results) budgets[r.name] = { size: r.size, mode: r.mode }
  return { version: 1, budgets }
}

function loadBaseline(file) {
  let json
  try {
    json = JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch (e) {
    throw new Error(`Cannot read baseline ${file}: ${e.message}`)
  }
  if (!json || json.version !== 1 || typeof json.budgets !== 'object') {
    throw new Error(`${file} is not a bytebudget baseline.`)
  }
  return json
}

/**
 * Return a new outcome where every result has `baseline` and `delta`
 * (bytes; null when there is nothing comparable to measure against).
 */
function compare(outcome, baseline) {
  const results = outcome.results.map(r => {
    const old = baseline.budgets[r.name]
    if (!old || old.mode !== r.mode) return { ...r, baseline: null, delta: null }
    return { ...r, baseline: old.size, delta: r.size - old.size }
  })
  return { ...outcome, results, compared: true }
}

function formatDelta(r) {
  if (r.delta === undefined) return ''
  if (r.delta === null) return 'new'
  if (r.delta === 0) return '±0'
  return `${r.delta > 0 ? '+' : '−'}${formatSize(Math.abs(r.delta))}`
}

/**
 * Markdown for a pull request comment. Starts with a hidden marker so a CI
 * script can find and update its own comment instead of posting a new one.
 */
function renderMarkdown(outcome) {
  const showDelta = outcome.results.some(r => r.delta !== undefined)
  const rows = outcome.results.map(r => {
    const status = r.passed ? '✅' : '❌'
    const cells = [
      r.name.replace(/\|/g, '\\|'),
      `${formatSize(r.size)} (${r.mode})`,
      formatSize(r.limit)
    ]
    if (showDelta) cells.push(formatDelta(r))
    cells.push(status)
    return `| ${cells.join(' | ')} |`
  })
  const head = showDelta
    ? '| Budget | Size | Limit | Change | |\n| --- | ---: | ---: | ---: | :---: |'
    : '| Budget | Size | Limit | |\n| --- | ---: | ---: | :---: |'
  const title = outcome.passed
    ? '### 📦 bytebudget: all budgets passed'
    : '### 📦 bytebudget: budget exceeded'
  return `${MARKER}\n${title}\n\n${head}\n${rows.join('\n')}\n`
}

module.exports = { createBaseline, loadBaseline, compare, formatDelta, renderMarkdown, MARKER }
