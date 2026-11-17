'use strict'

const fs = require('fs')
const path = require('path')
const zlib = require('zlib')
const { parseSize } = require('./size')
const { resolveFiles } = require('./glob')

const MODES = ['raw', 'gzip', 'brotli']

class ConfigError extends Error {}

/**
 * Find configuration: explicit file, bytebudget.config.json,
 * or the "bytebudget" key of package.json.
 */
function loadConfig(cwd, explicitFile) {
  const candidates = explicitFile
    ? [path.resolve(cwd, explicitFile)]
    : [path.join(cwd, 'bytebudget.config.json'), path.join(cwd, 'package.json')]

  for (const file of candidates) {
    if (!fs.existsSync(file)) {
      if (explicitFile) throw new ConfigError(`Config file not found: ${explicitFile}`)
      continue
    }
    let json
    try {
      json = JSON.parse(fs.readFileSync(file, 'utf8'))
    } catch (e) {
      throw new ConfigError(`Cannot parse ${path.basename(file)}: ${e.message}`)
    }
    const cfg = path.basename(file) === 'package.json' ? json.bytebudget : json
    if (cfg) return normalize(cfg)
  }
  throw new ConfigError(
    'No configuration found. Run `bytebudget --init` or add a "bytebudget" key to package.json.'
  )
}

function normalize(cfg) {
  const entries = Array.isArray(cfg) ? cfg : cfg.budgets
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new ConfigError('Config must contain a non-empty list of budgets.')
  }
  return entries.map((e, i) => {
    if (!e || !e.path) throw new ConfigError(`Budget #${i + 1} has no "path".`)
    if (e.limit === undefined) throw new ConfigError(`Budget #${i + 1} has no "limit".`)
    const mode = e.mode || 'gzip'
    if (!MODES.includes(mode)) {
      throw new ConfigError(`Budget #${i + 1}: mode must be one of ${MODES.join(', ')}.`)
    }
    let limit
    try {
      limit = parseSize(e.limit)
    } catch (err) {
      throw new ConfigError(`Budget #${i + 1}: ${err.message}`)
    }
    return {
      name: e.name || (Array.isArray(e.path) ? e.path.join(', ') : e.path),
      path: e.path,
      limit,
      mode
    }
  })
}

function compressedSize(buffer, mode) {
  if (mode === 'raw') return buffer.length
  if (mode === 'gzip') return zlib.gzipSync(buffer, { level: 9 }).length
  return zlib.brotliCompressSync(buffer, {
    params: {
      [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      [zlib.constants.BROTLI_PARAM_SIZE_HINT]: buffer.length
    }
  }).length
}

/**
 * Measure one budget: all matched files are concatenated, then compressed,
 * which is close to what a browser downloads for a single bundle.
 */
function measure(budget, cwd) {
  const files = resolveFiles(budget.path, cwd)
  if (files.length === 0) {
    throw new ConfigError(`Budget "${budget.name}": no files match ${JSON.stringify(budget.path)}`)
  }
  const buffers = files.map(f => fs.readFileSync(path.join(cwd, f)))
  const buffer = Buffer.concat(buffers)
  const size = compressedSize(buffer, budget.mode)
  return {
    name: budget.name,
    mode: budget.mode,
    files,
    rawSize: buffer.length,
    size,
    limit: budget.limit,
    ratio: budget.limit === 0 ? (size === 0 ? 0 : Infinity) : size / budget.limit,
    passed: size <= budget.limit
  }
}

function run(cwd, explicitFile) {
  const budgets = loadConfig(cwd, explicitFile)
  const results = budgets.map(b => measure(b, cwd))
  return { results, passed: results.every(r => r.passed) }
}

module.exports = { run, loadConfig, measure, normalize, ConfigError }
