// Minimal stored ZIP generator for archive security tests.
function crc32(data) {
  let crc = 0xffffffff
  for (const byte of data) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0)
  }
  return (crc ^ 0xffffffff) >>> 0
}

function zipFixture(entries) {
  const local = []
  const central = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name)
    const body = Buffer.from(entry.body || 'tool-data')
    const checksum = crc32(body)
    const header = Buffer.alloc(30)
    header.writeUInt32LE(0x04034b50)
    header.writeUInt16LE(20, 4)
    header.writeUInt32LE(checksum, 14)
    header.writeUInt32LE(body.length, 18)
    header.writeUInt32LE(body.length, 22)
    header.writeUInt16LE(name.length, 26)
    const directory = Buffer.alloc(46)
    directory.writeUInt32LE(0x02014b50)
    directory.writeUInt16LE((3 << 8) | 20, 4)
    directory.writeUInt16LE(20, 6)
    directory.writeUInt32LE(checksum, 16)
    directory.writeUInt32LE(body.length, 20)
    directory.writeUInt32LE(body.length, 24)
    directory.writeUInt16LE(name.length, 28)
    directory.writeUInt32LE(((entry.mode || 0o100755) << 16) >>> 0, 38)
    directory.writeUInt32LE(offset, 42)
    local.push(header, name, body)
    central.push(directory, name)
    offset += header.length + name.length + body.length
  }
  const centralData = Buffer.concat(central)
  const footer = Buffer.alloc(22)
  footer.writeUInt32LE(0x06054b50)
  footer.writeUInt16LE(entries.length, 8)
  footer.writeUInt16LE(entries.length, 10)
  footer.writeUInt32LE(centralData.length, 12)
  footer.writeUInt32LE(offset, 16)
  return Buffer.concat([...local, centralData, footer])
}

module.exports = { zipFixture }
