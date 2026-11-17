'use strict'
const test = require('node:test')
const assert = require('node:assert')
const fs = require('fs')
const os = require('os')
const path = require('path')
const { run, ConfigError, normalize } = require('../src/index')
const { renderCli } = require('../src/report-cli')
const { renderHtml } = require('../src/report-html')

function tmp(files, config) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bb-'))
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true })
    fs.writeFileSync(path.join(dir, name), content)
  }
  fs.writeFileSync(path.join(dir, 'bytebudget.config.json'), JSON.stringify(config))
  return dir
}

const code = 'console.log("hello world");\n'.repeat(400)

test('passes within limit, fails above it', () => {
  const dir = tmp({ 'dist/a.js': code }, {
    budgets: [
      { name: 'ok', path: 'dist/a.js', limit: '5 kB' },
      { name: 'tiny', path: 'dist/a.js', limit: '10 B', mode: 'raw' }
    ]
  })
  const { results, passed } = run(dir)
  assert.strictEqual(passed, false)
  assert.strictEqual(results[0].passed, true)
  assert.strictEqual(results[1].passed, false)
  assert.strictEqual(results[1].size, Buffer.byteLength(code))
})

test('gzip and brotli are smaller than raw for repetitive code', () => {
  const dir = tmp({ 'a.js': code }, {
    budgets: ['raw', 'gzip', 'brotli'].map(mode => ({ path: 'a.js', limit: '1 MB', mode }))
  })
  const [raw, gz, br] = run(dir).results.map(r => r.size)
  assert.ok(gz < raw && br < raw)
})

test('globs concatenate several files', () => {
  const dir = tmp({ 'dist/a.js': 'aaaa', 'dist/b.js': 'bbbb' }, {
    budgets: [{ path: 'dist/*.js', limit: '1 kB', mode: 'raw' }]
  })
  const [r] = run(dir).results
  assert.strictEqual(r.size, 8)
  assert.deepStrictEqual(r.files, ['dist/a.js', 'dist/b.js'])
})

test('errors: no match and bad config', () => {
  const dir = tmp({}, { budgets: [{ path: 'nothing.js', limit: '1 kB' }] })
  assert.throws(() => run(dir), ConfigError)
  assert.throws(() => normalize({ budgets: [] }), ConfigError)
  assert.throws(() => normalize([{ path: 'a.js' }]), ConfigError)
  assert.throws(() => normalize([{ path: 'a.js', limit: '1 kB', mode: 'zip' }]), ConfigError)
})

test('reports render', () => {
  const dir = tmp({ 'a.js': code }, { budgets: [{ name: 'x<y>', path: 'a.js', limit: '10 B', mode: 'raw' }] })
  const outcome = run(dir)
  assert.match(renderCli(outcome), /Budget exceeded/)
  const html = renderHtml(outcome)
  assert.match(html, /Over budget/)
  assert.ok(!html.includes('x<y>'), 'names must be escaped')
})

const { createBaseline, loadBaseline, compare, renderMarkdown, formatDelta } = require('../src/compare')

test('baseline round trip and comparison', () => {
  const dir = tmp({ 'a.js': code }, { budgets: [{ name: 'app', path: 'a.js', limit: '5 kB', mode: 'raw' }] })
  const before = run(dir)
  const file = path.join(dir, 'base.json')
  fs.writeFileSync(file, JSON.stringify(createBaseline(before)))

  fs.writeFileSync(path.join(dir, 'a.js'), code + 'x'.repeat(100))
  const after = compare(run(dir), loadBaseline(file))
  assert.strictEqual(after.results[0].delta, 100)
  assert.strictEqual(formatDelta(after.results[0]), '+100 B')

  const md = renderMarkdown(after)
  assert.ok(md.startsWith('<!-- bytebudget-report -->'))
  assert.match(md, /\+100 B/)
})

test('delta is null for new budgets or changed mode', () => {
  const dir = tmp({ 'a.js': code }, { budgets: [{ name: 'app', path: 'a.js', limit: '5 kB', mode: 'gzip' }] })
  const out = run(dir)
  const other = { version: 1, budgets: { app: { size: 10, mode: 'raw' } } }
  assert.strictEqual(compare(out, other).results[0].delta, null)
  assert.strictEqual(compare(out, { version: 1, budgets: {} }).results[0].delta, null)
  assert.strictEqual(formatDelta({ delta: null }), 'new')
})

test('markdown without comparison has no change column', () => {
  const dir = tmp({ 'a.js': code }, { budgets: [{ path: 'a.js', limit: '5 kB' }] })
  assert.ok(!renderMarkdown(run(dir)).includes('Change'))
})

test('loadBaseline rejects other json', () => {
  const dir = tmp({}, { budgets: [] })
  fs.writeFileSync(path.join(dir, 'x.json'), '{"hello":1}')
  assert.throws(() => loadBaseline(path.join(dir, 'x.json')))
})
