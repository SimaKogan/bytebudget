'use strict'

const UNITS = {
  b: 1,
  kb: 1000,
  mb: 1000 * 1000,
  gb: 1000 * 1000 * 1000,
  kib: 1024,
  mib: 1024 * 1024,
  gib: 1024 * 1024 * 1024
}

/**
 * Parse "10 kB", "1.5MB", "512 B", "2 KiB" or a plain number into bytes.
 */
function parseSize(input) {
  if (typeof input === 'number' && Number.isFinite(input) && input >= 0) {
    return Math.round(input)
  }
  if (typeof input !== 'string') {
    throw new TypeError(`Invalid size: ${JSON.stringify(input)}`)
  }
  const m = /^\s*(\d+(?:\.\d+)?)\s*([a-z]*)\s*$/i.exec(input)
  if (!m) throw new TypeError(`Invalid size: "${input}"`)
  const unit = (m[2] || 'b').toLowerCase()
  if (!(unit in UNITS)) throw new TypeError(`Unknown unit "${m[2]}" in "${input}"`)
  return Math.round(parseFloat(m[1]) * UNITS[unit])
}

/**
 * Format bytes as a short human string: 842 B, 12.3 kB, 1.20 MB.
 */
function formatSize(bytes) {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1000 * 1000) return `${trim(bytes / 1000)} kB`
  return `${trim(bytes / (1000 * 1000), 2)} MB`
}

function trim(n, digits = 1) {
  const s = n.toFixed(digits)
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s
}

module.exports = { parseSize, formatSize }
