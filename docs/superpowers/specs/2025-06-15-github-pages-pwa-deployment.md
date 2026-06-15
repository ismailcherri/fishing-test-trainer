# GitHub Pages Static Deployment + PWA - Design Spec

**Date**: 2025-06-15
**Repo**: `ismailcherri/fishing-test-trainer` → base path `/fishing-test-trainer/`

## Overview

Deploy the fishing license trainer as a static site to GitHub Pages with PWA support for mobile use (iPhone). Uses TanStack Start + Nitro for static pre-rendering.

## Build Configuration

### Nitro Static Generation

Add `nitro` dependency and configure Vite:

```ts
// vite.config.ts
import { nitro } from 'nitro/vite'

// Add to plugins array:
tanstackStart(), nitro({ preset: 'github_pages' }), viteReact()
```

Nitro's `github_pages` preset:
- Generates pre-rendered HTML for all routes
- Creates `.nojekyll` file
- Outputs to `.output/public/`
- Compatible with GitHub Pages directory structure

### Base Path

Set `base: '/fishing-test-trainer/'` in `vite.config.ts` to prefix all asset URLs.

Add `basepath: '/fishing-test-trainer'` to TanStack Router config in `src/router.tsx`.

### Routes Pre-rendered

All 7 routes pre-rendered at build time:
- `/` → index.html
- `/train/I` through `/train/V` → train/I/index.html, etc.
- `/test` → test/index.html
- `/settings` → settings/index.html

## PWA Configuration

### Manifest (`public/manifest.json`)

```json
{
  "name": "Fishing License Trainer",
  "short_name": "Fishing Trainer",
  "start_url": "/fishing-test-trainer/",
  "display": "standalone",
  "background_color": "#f9fafb",
  "theme_color": "#2563eb",
  "icons": [
    { "src": "/fishing-test-trainer/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/fishing-test-trainer/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Meta Tags (in `__root.tsx` head)

```tsx
{ rel: 'manifest', href: '/fishing-test-trainer/manifest.json' },
{ name: 'theme-color', content: '#2563eb' },
{ name: 'apple-mobile-web-app-capable', content: 'yes' },
{ name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
{ name: 'apple-mobile-web-app-title', content: 'Fishing Trainer' },
{ rel: 'apple-touch-icon', href: '/fishing-test-trainer/icon-192.png' },
```

### Icons

Two PNG icons (192x192 and 512x512). Generated as simple blue squares with a fish or letter "F" — or use a fish emoji as SVG base.

## GitHub Actions Deployment

### Workflow (`.github/workflows/deploy.yml`)

Trigger: push to `main` branch.

Steps:
1. Checkout repo
2. Setup Node.js
3. `npm ci`
4. `npm run build`
5. Deploy `.output/public/` to `gh-pages` branch using `peaceiris/actions-gh-pages`

The `gh-pages` branch will contain the static output, served by GitHub Pages.

### GitHub Pages Settings

- Source: Deploy from branch `gh-pages`
- No custom domain needed (uses `ismailcherri.github.io/fishing-test-trainer`)

## Files Changed

| File | Action | Purpose |
|------|--------|---------|
| `vite.config.ts` | Modify | Add nitro plugin, set base path |
| `src/router.tsx` | Modify | Add basepath |
| `package.json` | Modify | Add `nitro` dependency |
| `public/manifest.json` | Create | PWA manifest |
| `public/icon-192.png` | Create | PWA icon |
| `public/icon-512.png` | Create | PWA icon |
| `src/routes/__root.tsx` | Modify | Add PWA/iOS meta tags |
| `.github/workflows/deploy.yml` | Create | CI/CD deployment |

## Non-Goals

- Service worker (offline caching) — not needed for v1, all data is in public/questions.json loaded client-side
- Custom domain
- Dynamic base path detection (hardcoded to `/fishing-test-trainer/`)
