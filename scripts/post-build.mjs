import { readdirSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'

const clientDir = join(import.meta.dirname, '..', 'dist', 'client')
const assetsDir = join(clientDir, 'assets')

const files = readdirSync(assetsDir)
const cssFile = files.find((f) => f.startsWith('styles-') && f.endsWith('.css'))
const indexJs = files.find((f) => f.startsWith('index-') && f.endsWith('.js'))

if (!cssFile) throw new Error('CSS file not found in dist/client/assets')
if (!indexJs) throw new Error('Index JS file not found in dist/client/assets')

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <title>Fishing License Trainer</title>
  <meta name="theme-color" content="#2563eb">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="apple-mobile-web-app-title" content="Fishing Trainer">
  <link rel="manifest" href="/fishing-test-trainer/manifest.json">
  <link rel="apple-touch-icon" href="/fishing-test-trainer/icon-192.png">
  <link rel="stylesheet" href="/fishing-test-trainer/assets/${cssFile}">
</head>
<body>
  <div id="app"></div>
  <script type="module" src="/fishing-test-trainer/assets/${indexJs}"></script>
</body>
</html>
`

const indexPath = join(clientDir, 'index.html')
writeFileSync(indexPath, html)
console.log(`Generated ${indexPath}`)

const notFoundPath = join(clientDir, '404.html')
copyFileSync(indexPath, notFoundPath)
console.log(`Generated ${notFoundPath}`)

const nojekyllPath = join(clientDir, '.nojekyll')
writeFileSync(nojekyllPath, '')
console.log(`Generated ${nojekyllPath}`)
