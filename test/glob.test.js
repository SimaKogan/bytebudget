'use strict'
const test = require('node:test')
const assert = require('node:assert')
const { globToRegExp } = require('../src/glob')

test('* does not cross folders, ** does', () => {
  assert.ok(globToRegExp('dist/*.js').test('dist/a.js'))
  assert.ok(!globToRegExp('dist/*.js').test('dist/x/a.js'))
  assert.ok(globToRegExp('dist/**/*.js').test('dist/a.js'))
  assert.ok(globToRegExp('dist/**/*.js').test('dist/x/y/a.js'))
})

test('dots are literal', () => {
  assert.ok(!globToRegExp('a.js').test('abjs'))
})
