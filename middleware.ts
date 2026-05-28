// Next.js requires middleware in middleware.ts (not proxy.ts).
// proxy.ts holds all logic; this file re-exports it with the correct names.
export { proxy as default, config } from './proxy'
