const yauzl = require('yauzl')
const path = require('node:path')
const { createWriteStream } = require('node:fs')
const { pipeline } = require('node:stream/promises')

// Write only manifest-selected executables to fixed paths. Never reproduce archive paths or symlinks.
function extractExecutables(archive, destination, names, signal) {
  return new Promise((resolve, reject) => {
    yauzl.open(
      archive,
      { lazyEntries: true, strictFileNames: true, validateEntrySizes: true },
      (error, zip) => {
        if (error) return reject(error)
        const found = new Set()
        let settled = false
        let streaming = false
        const finish = (failure) => {
          if (settled) return
          settled = true
          signal?.removeEventListener('abort', cancel)
          zip.close()
          if (failure) reject(failure)
          else if (found.size !== names.length)
            reject(new Error('Tool archive is missing a required executable.'))
          else resolve()
        }
        const cancel = () => {
          // During extraction, pipeline must close the file before callers clean up on Windows.
          if (!streaming) finish(new Error('Operation cancelled.'))
        }
        signal?.addEventListener('abort', cancel, { once: true })
        if (signal?.aborted) return cancel()
        zip.on('error', finish)
        zip.on('end', () => finish())
        zip.on('entry', (entry) => {
          if (settled) return
          const name = path.posix.basename(entry.fileName)
          if (!names.includes(name)) {
            zip.readEntry()
            return
          }
          const mode = (entry.externalFileAttributes >>> 16) & 0o170000
          if (
            mode === 0o120000 ||
            mode === 0o040000 ||
            found.has(name) ||
            entry.uncompressedSize > 512 * 1024 * 1024 ||
            entry.uncompressedSize === 0
          ) {
            finish(new Error('Tool archive contains an invalid executable entry.'))
            return
          }
          streaming = true
          zip.openReadStream(entry, (streamError, stream) => {
            if (streamError) return finish(streamError)
            pipeline(
              stream,
              createWriteStream(path.join(destination, name), { flags: 'wx', mode: 0o700 }),
              { signal },
            ).then(() => {
              streaming = false
              found.add(name)
              if (signal?.aborted) cancel()
              else if (!settled) zip.readEntry()
            }, finish)
          })
        })
        zip.readEntry()
      },
    )
  })
}

module.exports = { extractExecutables }
