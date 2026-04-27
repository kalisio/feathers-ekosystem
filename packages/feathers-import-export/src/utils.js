import path from 'node:path'

export function getFullExtension (filename) {
  const base = path.basename(filename)
  const parts = base.split('.')
  if (parts.length <= 1) return ''
  parts.shift() // remove the main filename before first dot
  return '.' + parts.join('.')
}
