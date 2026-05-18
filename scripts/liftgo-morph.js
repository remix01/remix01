#!/usr/bin/env node

/**
 * LiftGO Morph CLI
 * AI-powered code refactoring for the LiftGO platform via Morph API.
 * Requires MORPH_API_KEY env var.
 */

import https from 'https';
import fs from 'fs';

const MORPH_API_KEY = process.env.MORPH_API_KEY;
if (!MORPH_API_KEY) {
  console.error('❌ MORPH_API_KEY env var is not set');
  process.exit(1);
}

const LIFTGO_CONTEXT = `
Context: LiftGO marketplace platform (Next.js 15 App Router, Supabase, Stripe Connect)
- obrtnik: service provider (craftsman)
- naročnik: customer
- Task status machine: draft → open → has_ponudbe → in_progress → completed | cancelled | expired
- DB tables: tasks, ponudbe, profiles, obrtnik_profiles, sporocila
- RLS enforced via obrtnik_id / customer_id columns
`;

function applyResult(file, result, save, outFile = file) {
  if (save) {
    fs.writeFileSync(outFile, result);
    console.log(`✅ Updated: ${outFile}`);
  } else {
    console.log(result);
    console.log('\n💡 Add --save to write changes to file');
  }
}

async function callMorphAPI(instruction, code, addContext = true) {
  const fullInstruction = addContext ? `${LIFTGO_CONTEXT}\n\n${instruction}` : instruction;
  const content = `<instruction>${fullInstruction}</instruction>\n<code>${code}</code>`;

  const data = JSON.stringify({
    model: 'morph-v3-fast',
    messages: [{ role: 'user', content }]
  });

  const options = {
    hostname: 'api.morphllm.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MORPH_API_KEY}`,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.error) reject(new Error(response.error.message));
          else if (response.choices?.[0]) resolve(response.choices[0].message.content);
          else reject(new Error('Unexpected response format'));
        } catch (e) {
          reject(new Error(`Parse error: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function processFile(file, instruction, addContext = true) {
  if (!fs.existsSync(file)) throw new Error(`File not found: ${file}`);
  const code = fs.readFileSync(file, 'utf8');
  console.log(`🔄 Processing: ${file}`);
  return callMorphAPI(instruction, code, addContext);
}

const COMMANDS = {
  test: async () => {
    console.log('🧪 Testing Morph API connection...\n');
    const testCode = `export async function updateTaskStatus(taskId: string, newStatus: string) {
  await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
}`;
    const result = await callMorphAPI(
      'Add RLS check for customer_id and validate task status transition',
      testCode
    );
    console.log('✅ Connected!\n' + '─'.repeat(60));
    console.log(result);
    console.log('─'.repeat(60));
  },

  'add-rls': async (file, options) => {
    const result = await processFile(file,
      'Add RLS policy check ensuring users can only access their own data via obrtnik_id or customer_id');
    applyResult(file, result, options.save);
  },

  'add-validation': async (file, options) => {
    const result = await processFile(file,
      'Add validation for LiftGO task status transitions: draft → open → has_ponudbe → in_progress → completed');
    applyResult(file, result, options.save);
  },

  'add-error-handling': async (file, options) => {
    const result = await processFile(file,
      'Add comprehensive error handling with user-friendly Slovenian error messages');
    applyResult(file, result, options.save);
  },

  'add-logging': async (file, options) => {
    const result = await processFile(file,
      'Add structured logging with obrtnik_id, customer_id, action, and timestamp');
    applyResult(file, result, options.save);
  },

  'add-stripe': async (file, options) => {
    const result = await processFile(file,
      'Add proper Stripe error handling with webhook validation and idempotency');
    applyResult(file, result, options.save);
  },

  'add-typescript': async (file, options) => {
    const result = await processFile(file,
      'Convert to TypeScript with strict types for LiftGO domain objects');
    const outFile = options.save ? file.replace(/\.[jt]sx?$/, '.ts') : file;
    applyResult(file, result, options.save, outFile);
  },

  custom: async (file, customInstruction, options) => {
    if (!customInstruction) {
      console.error('❌ custom command requires an instruction string as the third argument');
      process.exit(1);
    }
    const result = await processFile(file, customInstruction, false);
    applyResult(file, result, options.save);
  }
};

const args = process.argv.slice(2);
const command = args[0];
const file = args[1];
const customInstruction = args[2];
const options = { save: args.includes('--save') || args.includes('-s') };

if (!command || !COMMANDS[command]) {
  console.log(`
🚀 LiftGO Morph CLI

USAGE:
  node scripts/liftgo-morph.js <command> [file] [options]

COMMANDS:
  test                              Test API connection
  add-rls <file>                    Add RLS policies
  add-validation <file>             Add task status validation
  add-error-handling <file>         Add error handling (Slovenian messages)
  add-logging <file>                Add structured logging
  add-stripe <file>                 Add Stripe error handling
  add-typescript <file>             Convert to TypeScript
  custom <file> "instruction"       Custom instruction (no LiftGO context injected)

OPTIONS:
  --save, -s                        Write changes to file

EXAMPLES:
  node scripts/liftgo-morph.js test
  node scripts/liftgo-morph.js add-rls app/api/tasks/route.ts
  node scripts/liftgo-morph.js add-rls app/api/tasks/route.ts --save
  node scripts/liftgo-morph.js custom app/lib/stripe.ts "add JSDoc comments" --save

ENVIRONMENT:
  MORPH_API_KEY=<required>
  `);
  process.exit(0);
}

try {
  if (command === 'custom') {
    await COMMANDS[command](file, customInstruction, options);
  } else {
    await COMMANDS[command](file, options);
  }
} catch (error) {
  console.error('❌ Error:', error.message);
  process.exit(1);
}
