#!/usr/bin/env node
// MCP server: lets AI tools search and cite the vault.
// Deliberately NOT exposed here: approve, revoke, delete. Those are human-only (CLI).
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { Vault, VERDICTS } from './store.js';
import { defaultVaultPath } from './paths.js';

let vault;
try {
  vault = new Vault(defaultVaultPath(), { passphrase: process.env.KV_PASSPHRASE });
} catch (e) {
  console.error(`knowledge-vault: ${e.message}`);
  process.exit(1);
}

const server = new McpServer({ name: 'knowledge-vault', version: '0.1.0' });

const json = (value) => ({ content: [{ type: 'text', text: JSON.stringify(value, null, 2) }] });
const fail = (e) => ({ content: [{ type: 'text', text: `Error: ${e.message}` }], isError: true });
const run = (fn) => async (args) => {
  try { return json(await fn(args)); } catch (e) { return fail(e); }
};

server.registerTool('kv_search', {
  description: 'Keyword search over the vault. Returns matches with freshness status (fresh, stale, unverified, needs_review, disputed) and access (open, locked, approved). Check freshness before relying on an entry.',
  inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(50).optional() },
}, run(({ query, limit }) => vault.search(query, { limit: limit ?? 10 })));

server.registerTool('kv_get', {
  description: 'Get one entry by id, including its body. Private entries return body=null unless a human has approved access.',
  inputSchema: { id: z.string() },
}, run(({ id }) => vault.get(id)));

server.registerTool('kv_add', {
  description: 'Save a new entry (a fact, snippet, or doc summary) with an optional source_url. Use sensitivity "private" for anything that should not be returned without human approval.',
  inputSchema: {
    title: z.string().min(1),
    body: z.string().min(1),
    tags: z.array(z.string()).optional(),
    source_url: z.string().url().optional(),
    sensitivity: z.enum(['public', 'private']).optional(),
    ttl_days: z.number().int().min(1).max(3650).optional(),
  },
}, run((args) => vault.add(args)));

server.registerTool('kv_record_verification', {
  description: `Record a fact-check verdict for an entry. Verdicts: ${VERDICTS.join(', ')}. "supported" means the evidence confirms the entry and resets its freshness clock. "contradicted" marks it disputed. "unclear" flags it for human review. Always include evidence_url.`,
  inputSchema: {
    id: z.string(),
    verdict: z.enum(VERDICTS),
    evidence_url: z.string().url().optional(),
    note: z.string().optional(),
    checker: z.string().optional(),
  },
}, run((args) => vault.recordVerification(args)));

server.registerTool('kv_needs_attention', {
  description: 'List entries that are stale, unverified, disputed, or flagged for review. Use this to decide what to re-check.',
  inputSchema: { limit: z.number().int().min(1).max(200).optional() },
}, run(({ limit }) => vault.needsAttention(limit ?? 50)));

server.registerTool('kv_status', {
  description: 'Counts of entries by freshness status.',
  inputSchema: {},
}, run(() => vault.status()));

await server.connect(new StdioServerTransport());
