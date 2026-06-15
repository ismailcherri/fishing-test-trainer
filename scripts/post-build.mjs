import { writeFileSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = join(import.meta.dirname, '..', 'dist', 'client')

const shellPath = join(clientDir, '_shell.html')
const indexPath = join(clientDir, 'index.html')

if (existsSync(shellPath)) {
  copyFileSync(shellPath, indexPath)
  console.log(`Copied _shell.html → index.html`)
} else {
  console.log('_shell.html not found — prerender may not have run. Using existing index.html if present.')
}

if (!existsSync(indexPath)) {
  throw new Error('index.html not found in dist/client')
}

const notFoundPath = join(clientDir, '404.html')
copyFileSync(indexPath, notFoundPath)
console.log(`Copied index.html → 404.html`)

const nojekyllPath = join(clientDir, '.nojekyll')
writeFileSync(nojekyllPath, '')
console.log(`Generated ${nojekyllPath}`)
