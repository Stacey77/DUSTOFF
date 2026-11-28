#!/usr/bin/env node
// Retrieval evaluation. Scores whether the vault returns the right entry in the top K,
// whether it ever returns private text without approval, and how fresh the hits are.
// Usage: KV_HOME=... node eval/run.js [--k 3] [--questions eval/questions.json]
import { readFileSync } from 'node:fs';
import { Vault } from '../src/store.js';
import { defaultVaultPath } from '../src/paths.js';

const args = process.argv.slice(2);
const arg = (name, dflt) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : dflt; };
const K = Number(arg('k', 3));
const questions = JSON.parse(readFileSync(arg('questions', 'eval/questions.json'), 'utf8'));

const vault = new Vault(defaultVaultPath(), { passphrase: process.env.KV_PASSPHRASE, actor: 'eval' });
const results = [];
let hits = 0, expected = 0, leaks = 0, correctEmpty = 0, expectedEmpty = 0, freshHits = 0, totalHits = 0;

for (const q of questions) {
  const top = vault.search(q.question, { limit: K });
  const row = { id: q.id, question: q.question, returned: top.map((t) => t.title) };
  if (q.expect_none) {
    expectedEmpty++;
    row.pass = top.length === 0;
    if (row.pass) correctEmpty++;
  } else {
    expected++;
    const hit = top.some((t) => t.title === q.expect_title);
    row.pass = hit;
    if (hit) hits++;
    // Private text must never come back in a search result body; search never returns bodies, so check get() too.
    if (q.private) {
      const found = top.find((t) => t.title === q.expect_title);
      if (found && vault.get(found.id).body !== null) leaks++;
    }
  }
  for (const t of top) { totalHits++; if (t.freshness === 'fresh') freshHits++; }
  results.push(row);
}

const report = {
  questions: questions.length,
  k: K,
  recall_at_k: expected ? +(hits / expected).toFixed(2) : null,
  correct_empty_rate: expectedEmpty ? +(correctEmpty / expectedEmpty).toFixed(2) : null,
  private_leaks: leaks,
  fresh_share_of_hits: totalHits ? +(freshHits / totalHits).toFixed(2) : null,
  failures: results.filter((r) => !r.pass),
};
console.log(JSON.stringify(report, null, 2));
vault.close();
process.exitCode = report.private_leaks === 0 && (report.recall_at_k ?? 1) >= 0.8 ? 0 : 1;
