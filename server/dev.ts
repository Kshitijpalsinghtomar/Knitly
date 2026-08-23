/**
 * Dev API server.
 *
 *   bun run server/dev.ts        (or: pnpm dev:api)
 *
 * Figma Make sets `PORT` (default 8443) for the Vite dev server, so the API
 * can't share it. This launcher pins the API to a distinct port (API_PORT, or
 * 3000) *before* importing the server, and the Vite dev proxy forwards `/api`
 * there (see vite.config.ts). Using a dynamic import keeps the env assignment
 * ahead of the server's port read (static imports are hoisted, so a plain
 * `import './index'` would run before this line).
 */
process.env.API_PORT = process.env.API_PORT || '3000'
await import('./index')
