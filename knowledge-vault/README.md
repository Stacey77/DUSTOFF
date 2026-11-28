# knowledge-vault

A local-first memory for AI tools. You save facts, snippets, and doc summaries once. AI tools search the vault through MCP instead of re-researching the web every time. Each entry has a freshness status, a source link, and a fact-check history. Private entries stay locked until you approve them.

## Quick start

```bash
npm install
export KV_PASSPHRASE='a long passphrase you will remember'   # needed for private entries
export KV_HOME="$HOME/.knowledge-vault"                        # optional, default shown

node src/cli.js add --title "Next.js ISR" --body "Use revalidate for ISR pages." \
  --tags nextjs,caching --source https://nextjs.org/docs --ttl 60
node src/cli.js search "ISR revalidate"
node src/cli.js check <id>          # fetch the source and compare with the last snapshot
node src/cli.js attention           # stale, unverified, disputed, or flagged entries
```

## Connect it to an AI tool (MCP)

Add this to your MCP config (for Claude Code, a project `.mcp.json` or your user config). Replace the path:

```json
{
  "mcpServers": {
    "knowledge-vault": {
      "command": "node",
      "args": ["/home/user/knowledge-vault/src/mcp.js"],
      "env": { "KV_PASSPHRASE": "your passphrase" }
    }
  }
}
```

Tools exposed to the AI:

| Tool | What it does |
|---|---|
| `kv_search` | Keyword search. Returns freshness and access status for each match. |
| `kv_get` | Full entry. Private bodies come back as `null` unless you approved them. |
| `kv_add` | Save a new entry. Use `sensitivity: "private"` for anything sensitive. |
| `kv_record_verification` | Fact-checker reports `supported`, `contradicted`, or `unclear` with evidence. |
| `kv_needs_attention` | Lists entries that need re-checking. |
| `kv_status` | Counts by freshness. |

**Not exposed to the AI:** approve, revoke, delete. Those exist only in the CLI.

## Freshness

| Status | Meaning |
|---|---|
| `unverified` | Saved but never checked. |
| `fresh` | Verified, and inside its TTL (default 30 days). |
| `stale` | Verified, but the TTL has passed. Re-check it. |
| `needs_review` | Source changed, or a check was inconclusive. |
| `disputed` | A checker found the entry contradicted. |

`check` compares the source page to the snapshot from the last check. An unchanged page counts as `supported`. A changed page counts as `unclear`, which needs review. A baseline snapshot is recorded on the first check, and that check only confirms the page is reachable.

## Privacy model

- **Public entries** are stored in plaintext in a SQLite file with `0600` permissions.
- **Private entries** are encrypted with AES-256-GCM. The key comes from your passphrase through scrypt. Their text is never placed in the search index, so the AI cannot find them by content.
- **Approval** is a time window set by you in the CLI (`kv approve <id> --minutes 15`). After it expires, the entry locks again.
- **Wrong passphrase** is refused. The check token is stored in the vault.

**Limits to know about:** this is a guardrail, not a sandbox. Anyone with your OS account can read the SQLite file, and the passphrase has to be in the MCP server's environment for the server to decrypt private entries. If an AI tool can run shell commands as you, it could in principle run the CLI itself. Keep private material out of agent-accessible shells where possible. Cloud sync is not built yet, and when it is, it should sync ciphertext only.

## Backups (Cloudflare R2)

The whole vault is encrypted with your passphrase before it leaves the machine. R2 only ever stores ciphertext.

```bash
export R2_ACCOUNT_ID=...  R2_ACCESS_KEY_ID=...  R2_SECRET_ACCESS_KEY=...   # R2 API token, bucket-scoped
node src/cli.js backup --out ./backup.kvbak                  # local encrypted file
node src/cli.js backup --r2 my-vault-bucket                  # upload to R2
node src/cli.js restore --from ./backup.kvbak --to ~/restored/vault.db
node src/cli.js restore --r2 my-vault-bucket --key <object-key> --to ~/restored/vault.db
```

## Not built yet

- Embeddings / semantic search (current search is keyword BM25 via FTS5, offline, no API keys).
- Automatic subagent fact-checking. The `kv_record_verification` tool is the hook for it. The subagent itself still needs to be wired up.

## Tests

```bash
npm test
```

## Audit log

Every add, read, denied read, approval, revocation, and verification is logged with its actor (set `KV_ACTOR`, or the default is `unknown`).

```bash
node src/cli.js audit --limit 50
```

## Evaluation

`eval/questions.json` holds questions with known-correct answers. The harness checks whether the right entry comes back in the top K results, whether private text ever leaks, and how fresh the hits are. The included questions are illustrative. Replace them with questions your own team asks.

```bash
node eval/run.js --k 3          # exits non-zero on a private leak or recall below 80%
```
