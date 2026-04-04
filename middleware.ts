/**
 * Next.js Middleware entry point.
 * Logic lives in proxy.ts — this file just wires it up correctly.
 * Next.js only recognises "middleware.ts" at the project root.
 */
export { proxy as middleware, config } from './proxy'
