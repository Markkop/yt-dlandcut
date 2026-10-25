const { spawn } = require('node:child_process')
const activeChildren = new Set()

function terminate(child) {
  if (!child.pid) return
  if (process.platform === 'win32') {
    // Terminate yt-dlp's FFmpeg/Deno children too, using fixed arguments and no shell.
    const killer = spawn('taskkill.exe', ['/pid', String(child.pid), '/T', '/F'], {
      windowsHide: true,
      stdio: 'ignore',
    })
    killer.once('error', () => child.kill())
  } else {
    try {
      process.kill(-child.pid, 'SIGTERM')
    } catch {
      child.kill()
    }
  }
}

function runProcess(
  command,
  args,
  {
    onLine = () => {},
    timeout = 2 * 60 * 60 * 1000,
    signal,
    maxOutput = 2 * 1024 * 1024,
    spawnImpl = spawn,
  } = {},
) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('Operation cancelled.'))
    const child = spawnImpl(command, args, {
      shell: false,
      windowsHide: true,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    activeChildren.add(child)
    let output = ''
    let diagnostics = ''
    let failure
    let forceTimer
    const stop = (error) => {
      if (failure) return
      failure = error
      terminate(child)
      if (process.platform !== 'win32' && child.pid) {
        forceTimer = setTimeout(() => {
          try {
            process.kill(-child.pid, 'SIGKILL')
          } catch {
            /* Already exited. */
          }
        }, 5000)
      }
    }
    const cancel = () => stop(new Error('Operation cancelled.'))
    signal?.addEventListener('abort', cancel, { once: true })
    const timer = setTimeout(
      () => stop(new Error('Operation timed out. Please try again.')),
      timeout,
    )
    for (const stream of [child.stdout, child.stderr]) {
      let pending = ''
      stream.on('data', (chunk) => {
        const text = chunk.toString()
        diagnostics = `${diagnostics}${text}`.slice(-8000)
        const lines = `${pending}${text}`.split(/\r?\n/)
        pending = lines.pop().slice(-2000)
        for (const line of lines) onLine(line.slice(0, 2000))
      })
      stream.on('end', () => {
        if (pending) onLine(pending)
      })
    }
    child.stdout.on('data', (chunk) => {
      if (output.length + chunk.length > maxOutput)
        stop(new Error('Tool returned too much output.'))
      else output += chunk.toString()
    })
    child.once('error', (error) => {
      failure = error
    })
    child.once('close', (code) => {
      clearTimeout(timer)
      clearTimeout(forceTimer)
      signal?.removeEventListener('abort', cancel)
      activeChildren.delete(child)
      if (failure) reject(failure)
      else if (code !== 0)
        reject(new Error(`${command.split(/[\\/]/).pop()} failed (${code}): ${diagnostics.trim()}`))
      else resolve(output.trim())
    })
  })
}

function stopChildren() {
  for (const child of activeChildren) terminate(child)
}

module.exports = { runProcess, stopChildren }
