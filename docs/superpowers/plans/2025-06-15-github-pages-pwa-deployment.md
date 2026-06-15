# GitHub Pages Static Deployment + PWA - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure TanStack Start for static export to GitHub Pages with PWA manifest and iOS mobile support.

**Architecture:** Nitro with `github_pages` preset generates pre-rendered static HTML. Base path `/fishing-test-trainer/` configured in Vite, Router, and manifest.

**Tech Stack:** TanStack Start (React 19), Nitro, GitHub Actions, GitHub Pages

---

### File Map

| File | Action | Purpose |
|------|--------|---------|
| `package.json` | Modify | Add `nitro` dependency |
| `vite.config.ts` | Modify | Add nitro plugin, set base path |
| `src/router.tsx` | Modify | Add basepath |
| `public/manifest.json` | Create | PWA manifest |
| `public/icon-192.png` | Create | PWA icon 192x192 |
| `public/icon-512.png` | Create | PWA icon 512x512 |
| `src/routes/__root.tsx` | Modify | Add PWA/iOS meta tags |
| `.github/workflows/deploy.yml` | Create | CI/CD deployment |

---

### Task 1: Install Nitro and configure Vite

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`

- [ ] **Step 1: Install nitro**

```bash
npm install nitro
```

- [ ] **Step 2: Modify `vite.config.ts`**

Read the current file, then apply these changes:

Add the nitro import at the top (after existing imports):
```ts
import { nitro } from 'nitro/vite'
```

Set the base path in the config object (add `base` property):
```ts
const config = defineConfig({
  base: '/fishing-test-trainer/',
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro({ preset: 'github_pages' }), viteReact()],
})
```

The final file should look like:
```ts
import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import { nitro } from 'nitro/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const config = defineConfig({
  base: '/fishing-test-trainer/',
  resolve: { tsconfigPaths: true },
  plugins: [devtools(), tailwindcss(), tanstackStart(), nitro({ preset: 'github_pages' }), viteReact()],
})

export default config
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json vite.config.ts
git commit -m "feat: add nitro with github_pages preset and base path"
```

---

### Task 2: Configure router basepath

**Files:**
- Modify: `src/router.tsx`

- [ ] **Step 1: Modify `src/router.tsx`**

Read the current file, then add `basepath` to the router config:

Current:
```ts
const router = createTanStackRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})
```

Change to:
```ts
const router = createTanStackRouter({
  routeTree,
  scrollRestoration: true,
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
  basepath: '/fishing-test-trainer',
})
```

- [ ] **Step 2: Commit**

```bash
git add src/router.tsx
git commit -m "feat: add basepath for GitHub Pages deployment"
```

---

### Task 3: Create PWA manifest and icons

**Files:**
- Create: `public/manifest.json`
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Write `public/manifest.json`**

```json
{
  "name": "Fishing License Trainer",
  "short_name": "Fishing Trainer",
  "start_url": "/fishing-test-trainer/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#2563eb",
  "icons": [
    {
      "src": "/fishing-test-trainer/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/fishing-test-trainer/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

- [ ] **Step 2: Generate icon images**

Use a script to generate simple blue square PNGs with a fish emoji. Create a temporary script:

```bash
node -e "
const { writeFileSync } = require('fs');

// Minimal valid 1x1 blue PNG placeholder — we'll use a real approach instead.
// Create an SVG-based icon using a simple approach.
"
```

Since we can't install canvas dependencies, create SVG files and convert them. Alternatively, generate minimal PNGs:

Create `public/icon-192.png` and `public/icon-512.png` as simple placeholder blue squares. For real icons, you can replace them later.

Run this to create minimal valid PNGs:
```bash
printf '\x89PNG\r\n\x1a\n' > /tmp/png_header
# Create a minimal 1x1 blue PNG using node's built-in zlib
node -e "
const zlib = require('zlib');

function createPNG(size, r, g, b) {
  // IHDR
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);  // width
  ihdr.writeUInt32BE(size, 4);  // height
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 2;   // color type (RGB)
  ihdr[10] = 0;  // compression
  ihdr[11] = 0;  // filter
  ihdr[12] = 0;  // interlace
  
  // IDAT - raw pixel data (one row with filter byte 0, then RGB pixels)
  const rawData = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    rawData[y * (1 + size * 3)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const offset = y * (1 + size * 3) + 1 + x * 3;
      rawData[offset] = r;
      rawData[offset + 1] = g;
      rawData[offset + 2] = b;
    }
  }
  
  const deflated = zlib.deflateSync(rawData);
  
  function chunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeB = Buffer.from(type, 'ascii');
    const crc = crc32(Buffer.concat([typeB, data]));
    const crcB = Buffer.alloc(4);
    crcB.writeUInt32BE(crc, 0);
    return Buffer.concat([len, typeB, data, crcB]);
  }
  
  function crc32(buf) {
    let c;
    const table = [];
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      }
      table[n] = c;
    }
    c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      c = table[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
  }
  
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = chunk('IHDR', ihdr);
  const idatChunk = chunk('IDAT', deflated);
  const iendChunk = chunk('IEND', Buffer.alloc(0));
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const fs = require('fs');
fs.writeFileSync('public/icon-192.png', createPNG(192, 37, 99, 235));
fs.writeFileSync('public/icon-512.png', createPNG(512, 37, 99, 235));
console.log('Icons generated');
"
```

- [ ] **Step 3: Commit**

```bash
git add public/manifest.json public/icon-192.png public/icon-512.png
git commit -m "feat: add PWA manifest and app icons"
```

---

### Task 4: Add PWA and iOS meta tags to root route

**Files:**
- Modify: `src/routes/__root.tsx`

- [ ] **Step 1: Read and modify `src/routes/__root.tsx`**

Add the PWA/iOS meta tags and manifest link to the `head` function's `meta` and `links` arrays.

Current `head` function:
```tsx
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'Fishing License Trainer',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
```

Replace with:
```tsx
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'Fishing License Trainer',
      },
      {
        name: 'theme-color',
        content: '#2563eb',
      },
      {
        name: 'apple-mobile-web-app-capable',
        content: 'yes',
      },
      {
        name: 'apple-mobile-web-app-status-bar-style',
        content: 'black-translucent',
      },
      {
        name: 'apple-mobile-web-app-title',
        content: 'Fishing Trainer',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'manifest',
        href: '/fishing-test-trainer/manifest.json',
      },
      {
        rel: 'apple-touch-icon',
        href: '/fishing-test-trainer/icon-192.png',
      },
    ],
  }),
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/__root.tsx
git commit -m "feat: add PWA and iOS meta tags"
```

---

### Task 5: Create GitHub Actions workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create directory and workflow file**

```bash
mkdir -p .github/workflows
```

Write `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .output/public
      - uses: actions/deploy-pages@v4
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy workflow for GitHub Pages"
```

---

### Task 6: Build verification and push

**Files:**
- None (verification only)

- [ ] **Step 1: Run existing tests**

```bash
npx vitest run
```
Expected: 13 tests pass

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: Build succeeds, output in `.output/public/` with pre-rendered HTML files

- [ ] **Step 3: Verify output structure**

```bash
ls .output/public/
```
Expected: Contains `index.html`, `manifest.json`, `.nojekyll`, `icon-*.png`, and subdirectories for routes

- [ ] **Step 4: Verify routes pre-rendered**

```bash
ls .output/public/train/
```
Expected: Contains `I/index.html`, `II/index.html`, etc.

- [ ] **Step 5: Commit any remaining changes**

```bash
git add -A
git commit -m "chore: final build verification" || echo "Nothing to commit"
```

- [ ] **Step 6: Push to trigger deployment**

```bash
git push origin main
```
Expected: GitHub Actions workflow triggers, deploys to GitHub Pages at `https://ismailcherri.github.io/fishing-test-trainer/`
