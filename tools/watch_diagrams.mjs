import { execFile } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const repoRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const targets = [
  path.join(repoRoot, 'backend', 'store'),
  path.join(repoRoot, 'backend', 'config'),
  path.join(repoRoot, 'frontend', 'src'),
]

let timer = null
let running = false
let queued = false

function run() {
  if (running) {
    queued = true
    return
  }
  running = true
  execFile('python3', [path.join(repoRoot, 'tools', 'generate_diagrams.py')], (err, stdout, stderr) => {
    if (err) {
      process.stdout.write(stderr || err.message)
    } else {
      process.stdout.write(String(stdout).trim() ? stdout : '')
      process.stdout.write('\n')
    }
    running = false
    if (queued) {
      queued = false
      run()
    }
  })
}

function schedule() {
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => run(), 250)
}

function watchDir(dir) {
  if (!fs.existsSync(dir)) return
  fs.watch(dir, { recursive: true }, (_eventType, filename) => {
    if (!filename) return
    const f = String(filename)
    if (f.includes('node_modules')) return
    if (f.endsWith('.py') || f.endsWith('.jsx') || f.endsWith('.js')) schedule()
  })
}

for (const t of targets) watchDir(t)
run()
process.stdout.write('watch_diagrams: escuchando cambios…\n')

