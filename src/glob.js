'use strict'

const fs = require('fs')
const path = require('path')

const IGNORED_DIRS = new Set(['node_modules', '.git'])

/**
 * Convert a glob (*, **, ?) to a RegExp that matches POSIX-style relative paths.
 */
function globToRegExp(glob) {
  let re = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') {
          i++
          re += '(?:.*/)?'
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else {
      re += c.replace(/[.+^${}()|[\]\\]/g, '\\$&')
    }
  }
  return new RegExp(`^${re}$`)
}

function walk(dir, root, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, root, out)
    else if (entry.isFile()) out.push(path.relative(root, full).split(path.sep).join('/'))
  }
}

/**
 * Resolve one pattern (or a list) to a sorted, de-duplicated list of files.
 * Patterns are relative to `cwd`.
 */
function resolveFiles(patterns, cwd) {
  const list = Array.isArray(patterns) ? patterns : [patterns]
  const all = []
  walk(cwd, cwd, all)
  const found = new Set()
  for (const raw of list) {
    const pattern = raw.replace(/^\.\//, '').split(path.sep).join('/')
    if (!/[*?]/.test(pattern)) {
      const abs = path.join(cwd, pattern)
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) found.add(pattern)
      continue
    }
    const re = globToRegExp(pattern)
    for (const f of all) if (re.test(f)) found.add(f)
  }
  return [...found].sort()
}

module.exports = { resolveFiles, globToRegExp }
