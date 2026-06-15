<!-- intent-skills:start -->
## Skill Loading

Before substantial work:
- Skill check: run `npx @tanstack/intent@latest list`, or use skills already listed in context.
- Skill guidance: if one local skill clearly matches the task, run `npx @tanstack/intent@latest load <package>#<skill>` and follow the returned `SKILL.md`.
- Monorepos: when working across packages, run the skill check from the workspace root and prefer the local skill for the package being changed.
- Multiple matches: prefer the most specific local skill for the package or concern you are changing; load additional skills only when the task spans multiple packages or concerns.
<!-- intent-skills:end -->

# Project: my-tanstack-app (angleschein-test)

## Scaffolding

- **Scaffold command**: `npx @tanstack/cli@latest create my-tanstack-app --framework react --no-examples --yes --intent`
- **TanStack Intent setup**: `npx @tanstack/intent@latest install` (wired AGENTS.md)
- **TanStack Intent list**: `npx @tanstack/intent@latest list` (31 skills across 9 packages)

## Stack

| Concern        | Choice                        |
|----------------|-------------------------------|
| Framework      | React 19.2                    |
| Router         | TanStack Router (file-based)  |
| Start          | TanStack Start (SSR)          |
| Styling        | Tailwind CSS v4               |
| Bundler        | Vite 8                        |
| Toolchain      | Default (Vitest, no Biome/Eslint) |
| Package manager| npm                           |
| TypeScript     | ^6.0.2 (strict mode)          |

## Key Dependencies

- `@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/router-plugin`
- `@tanstack/react-devtools`, `@tanstack/react-router-devtools`, `@tanstack/devtools-vite`
- `@tailwindcss/vite`, `tailwindcss` v4
- `react`, `react-dom` v19
- `lucide-react` (icons)

## Project Structure

```
src/
  router.tsx          - Router factory with scrollRestoration, preloading
  routes/
    __root.tsx        - Root route with HTML shell, head, devtools
    index.tsx         - Home page
  routeTree.gen.ts    - Auto-generated route tree (do not edit)
  styles.css          - Tailwind import + base resets
vite.config.ts        - devtools, tailwindcss, tanstackStart, viteReact plugins
tsr.config.json       - Router target: react
tsconfig.json         - ES2022, bundler resolution, strict, path aliases (#/*, @/*)
```

## Scripts

- `npm run dev`          - Vite dev server on port 3000
- `npm run build`        - Production build
- `npm run preview`      - Preview production build
- `npm run generate-routes` - Regenerate route tree
- `npm run test`         - Vitest

## Environment Variables

None required out of the box. Database, auth, and deployment integrations would need their own env vars (not yet configured).

## Deployment

Default Nitro preset (Node.js). Can be changed via `--deployment` flag (cloudflare, netlify, nitro, railway).

## Known Gotchas

- The generated `package.json` has `pnpm.onlyBuiltDependencies` — safe to ignore with npm.
- `routeTree.gen.ts` is auto-generated; never edit it manually.
- `.tanstack/` and `.output/` are git-ignored build artifacts.
- Tailwind CSS is always-on per the CLI's current behavior; `--no-tailwind` is ignored.

## TanStack Intent Skills Available

Run `npx @tanstack/intent@latest list` to view current skills. Key skills:
- `@tanstack/react-start#react-start` — React bindings, createStart, StartClient, StartServer
- `@tanstack/router-core#router-core` — Route trees, file-based routing conventions
- `@tanstack/router-core#data-loading` — Loaders, staleTime, caching
- `@tanstack/start-client-core#server-functions` — createServerFn, validators
- `@tanstack/start-client-core#deployment` — Cloudflare, Netlify, Vercel, Node/Docker

## Next Steps

- Add more routes in `src/routes/`
- Configure deployment adapter if not using default Nitro/Node
- Set up a database and auth if needed
- Customize the root layout in `src/routes/__root.tsx`
