'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { parseSize, formatSize } = require('../src/size')

test('parseSize understands units', () => {
  assert.strictEqual(parseSize('10 kB'), 10000)
  assert.strictEqual(parseSize('1.5MB'), 1500000)
  assert.strictEqual(parseSize('2 KiB'), 2048)
  assert.strictEqual(parseSize('512'), 512)
  assert.strictEqual(parseSize(300), 300)
})

test('parseSize rejects garbage', () => {
  assert.throws(() => parseSize('abc'))
  assert.throws(() => parseSize('10 parsecs'))
  assert.throws(() => parseSize(-1))
  assert.throws(() => parseSize(null))
})

test('formatSize', () => {
  assert.strictEqual(formatSize(842), '842 B')
  assert.strictEqual(formatSize(12345), '12.3 kB')
  assert.strictEqual(formatSize(10000), '10 kB')
  assert.strictEqual(formatSize(1200000), '1.2 MB')
})
