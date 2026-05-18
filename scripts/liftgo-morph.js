#!/usr/bin/env node
/**
 * liftgo-morph.js — AI-assisted file transformation for LiftGO
 *
 * Usage:
 *   node scripts/liftgo-morph.js <command> [options] <file...>
 *
 * Commands:
 *   add-typescript   Convert JS/JSX to TypeScript with strict LiftGO domain types
 *   add-jsdoc        Add JSDoc comments to functions and exports
 *   extract-types    Pull inline types out into a shared types file
 *   cleanup          Fix lint warnings, remove dead code, enforce conventions
 *
 * Options:
 *   --save           Write result back to disk (default: dry-run to stdout)
 *   --model <id>     Claude model to use (default: claude-sonnet-4-6)
 *   --dry-run        Print transformed content without saving (default)
 */

import fs from 'fs/promises'
import path from 'path'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Extension mapping ─────────────────────────────────────────────────────────
// .js  → .ts   (no JSX, plain TypeScript)
// .jsx → .tsx  (contains JSX, must stay parseable as JSX)
// .ts  → .ts   (already TypeScript, keep)
// .tsx → .tsx  (already TSX, keep)
function toTypescriptExtension(filePath) {
  return filePath.replace(/\.[jt]sx?$/, (ext) => ext.replace('j', 't'))
}

// ── Core AI transformer ───────────────────────────────────────────────────────
async function processFile(filePath, instruction, model = 'claude-sonnet-4-6') {
  const source = await fs.readFile(filePath, 'utf8')
  const ext = path.extname(filePath)

  const message = await client.messages.create({
    model,
    max_tokens: 8192,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: [
              `File: ${filePath}`,
              `Task: ${instruction}`,
              '',
              'Return ONLY the transformed file content — no markdown fences, no explanation.',
              `Preserve the file\'s original language features (e.g. keep JSX if the extension is ${ext}).`,
              '',
              '```',
              source,
              '```',
            ].join('\n'),
          },
        ],
      },
    ],
  })

  const block = message.content.find((b) => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('No text response from model')

  // Strip any accidental markdown fences the model added
  return block.text
    .replace(/^```[a-z]*\n?/m, '')
    .replace(/\n?```$/m, '')
    .trim()
}

// ── Commands ──────────────────────────────────────────────────────────────────
const COMMANDS = {
  'add-typescript': async (file, options) => {
    const result = await processFile(
      file,
      'Convert to TypeScript with strict types for LiftGO domain objects ' +
        '(narocnik, obrtnik, task, ponudba, sporocilo). ' +
        'Use explicit return types, avoid `any`, import shared types from @/types where appropriate.',
      options.model,
    )

    // .js → .ts  |  .jsx → .tsx  |  .ts/.tsx unchanged
    const outFile = options.save ? toTypescriptExtension(file) : file
    return { result, outFile }
  },

  'add-jsdoc': async (file, options) => {
    const result = await processFile(
      file,
      'Add concise JSDoc comments to every exported function, class, and type. ' +
        'One-line summary only — no @param/@returns boilerplate unless the signature is non-obvious.',
      options.model,
    )
    return { result, outFile: file }
  },

  'extract-types': async (file, options) => {
    const result = await processFile(
      file,
      'Extract all inline type and interface definitions into a separate types block at the top of the file. ' +
        'Export every extracted type. Do not move them to a different file — keep them in this file.',
      options.model,
    )
    return { result, outFile: file }
  },

  cleanup: async (file, options) => {
    const result = await processFile(
      file,
      'Fix lint warnings, remove dead code and unused imports, ' +
        'apply LiftGO naming conventions (camelCase vars, PascalCase components/types, ' +
        'Slovenian domain nouns kept as-is: narocnik, obrtnik, ponudba, etc.).',
      options.model,
    )
    return { result, outFile: file }
  },
}

// ── CLI entry point ───────────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2)

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(
      [
        'Usage: node scripts/liftgo-morph.js <command> [--save] [--model <id>] <file...>',
        '',
        'Commands: ' + Object.keys(COMMANDS).join(', '),
      ].join('\n'),
    )
    process.exit(0)
  }

  const command = args[0]
  if (!COMMANDS[command]) {
    console.error(`Unknown command: ${command}. Available: ${Object.keys(COMMANDS).join(', ')}`)
    process.exit(1)
  }

  const options = {
    save: args.includes('--save'),
    dryRun: !args.includes('--save'),
    model: (() => {
      const idx = args.indexOf('--model')
      return idx !== -1 ? args[idx + 1] : 'claude-sonnet-4-6'
    })(),
  }

  const files = args.slice(1).filter((a) => !a.startsWith('--') && a !== options.model)

  if (files.length === 0) {
    console.error('No files specified.')
    process.exit(1)
  }

  for (const file of files) {
    console.error(`→ ${command}: ${file}`)
    try {
      const { result, outFile } = await COMMANDS[command](file, options)

      if (options.save) {
        await fs.writeFile(outFile, result, 'utf8')
        const renamed = outFile !== file ? ` (saved as ${path.basename(outFile)})` : ''
        console.error(`  ✓ saved${renamed}`)
      } else {
        console.log(`// ── ${outFile} ──`)
        console.log(result)
        console.log()
      }
    } catch (err) {
      console.error(`  ✗ ${err.message}`)
      process.exitCode = 1
    }
  }
}

main()
