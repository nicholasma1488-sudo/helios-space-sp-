import { spawn } from 'node:child_process'

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const children = [
  spawn(npm, ['run', 'dev:server'], { stdio: 'inherit', env: process.env }),
  spawn(npm, ['run', 'dev:client'], { stdio: 'inherit', env: process.env }),
]

let stopping = false

function stop(signal = 'SIGTERM') {
  if (stopping) return
  stopping = true
  for (const child of children) {
    if (!child.killed) child.kill(signal)
  }
}

for (const child of children) {
  child.on('error', error => {
    console.error(error.message)
    process.exitCode = 1
    stop()
  })
  child.on('exit', (code, signal) => {
    if (!stopping) {
      process.exitCode = code ?? (signal ? 1 : 0)
      stop()
    }
  })
}

process.on('SIGINT', () => stop('SIGINT'))
process.on('SIGTERM', () => stop('SIGTERM'))
