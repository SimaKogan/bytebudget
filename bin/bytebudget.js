#!/usr/bin/env node
'use strict'

const fs = require('fs')
const path = require('path')
const { run, ConfigError } = require('../src/index')
const { renderCli } = require('../src/report-cli')
const { renderHtml } = require('../src/report-html')
const { createBaseline, loadBaseline, compare, renderMarkdown } = require('../src/compare')
const pkg = require('../package.json')

const HELP = `
bytebudget ${pkg.version} - keep your JavaScript within a size budget

Usage
  bytebudget [options]

Options
  -c, --config <file>         Use a specific JSON config file
      --json                  Print results as JSON
      --html <file>           Also write a self-contained HTML report
      --save-baseline <file>  Save current sizes as a baseline snapshot
      --compare <file>        Show the change against a saved baseline
      --markdown <file>       Write a Markdown report (for pull request comments)
      --init                  Create bytebudget.config.json in the current folder
      --no-color              Disable coloured output
  -v, --version               Print version
  -h, --help                  Show this help

Exit codes
  0  all budgets passed     1  a budget was exceeded     2  configuration error
`

const INIT_CONFIG = {
  budgets: [
    { name: 'App bundle', path: 'dist/*.js', limit: '50 kB', mode: 'gzip' }
  ]
}

function parseArgs(argv) {
  const opts = { json: false, color: true }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '-h' || a === '--help') opts.help = true
    else if (a === '-v' || a === '--version') opts.version = true
    else if (a === '--json') opts.json = true
    else if (a === '--init') opts.init = true
    else if (a === '--no-color') opts.color = false
    else if (a === '-c' || a === '--config') opts.config = argv[++i]
    else if (a === '--html') opts.html = argv[++i]
    else if (a === '--save-baseline') opts.saveBaseline = argv[++i]
    else if (a === '--compare') opts.compare = argv[++i]
    else if (a === '--markdown') opts.markdown = argv[++i]
    else throw new ConfigError(`Unknown option: ${a}`)
  }
  if ((argv.includes('-c') || argv.includes('--config')) && !opts.config) {
    throw new ConfigError('--config needs a file path')
  }
  for (const flag of ['--html', '--save-baseline', '--compare', '--markdown']) {
    const i = argv.indexOf(flag)
    if (i !== -1 && (!argv[i + 1] || argv[i + 1].startsWith('-'))) {
      throw new ConfigError(`${flag} needs a file path`)
    }
  }
  return opts
}

function main() {
  const cwd = process.cwd()
  try {
    const opts = parseArgs(process.argv.slice(2))
    if (opts.help) return console.log(HELP)
    if (opts.version) return console.log(pkg.version)

    if (opts.init) {
      const target = path.join(cwd, 'bytebudget.config.json')
      if (fs.existsSync(target)) throw new ConfigError('bytebudget.config.json already exists.')
      fs.writeFileSync(target, JSON.stringify(INIT_CONFIG, null, 2) + '\n')
      return console.log('Created bytebudget.config.json')
    }

    let outcome = run(cwd, opts.config)

    if (opts.saveBaseline) {
      fs.writeFileSync(path.resolve(cwd, opts.saveBaseline), JSON.stringify(createBaseline(outcome), null, 2) + '\n')
    }
    if (opts.compare) {
      let baseline
      try {
        baseline = loadBaseline(path.resolve(cwd, opts.compare))
      } catch (e) {
        throw new ConfigError(e.message)
      }
      outcome = compare(outcome, baseline)
    }
    if (opts.markdown) {
      fs.writeFileSync(path.resolve(cwd, opts.markdown), renderMarkdown(outcome))
    }

    if (opts.html) {
      fs.writeFileSync(path.resolve(cwd, opts.html), renderHtml(outcome))
    }

    if (opts.json) {
      console.log(JSON.stringify(outcome, null, 2))
    } else {
      const color = opts.color && process.stdout.isTTY && !process.env.NO_COLOR
      console.log(renderCli(outcome, { color }))
      if (opts.html) console.log(`  HTML report: ${opts.html}\n`)
    }
    process.exitCode = outcome.passed ? 0 : 1
  } catch (e) {
    if (e instanceof ConfigError) {
      console.error(`bytebudget: ${e.message}`)
      process.exitCode = 2
    } else {
      throw e
    }
  }
}

main()
