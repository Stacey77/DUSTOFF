---
name: open-dev-workspace
description: Open a Gitea-backed coding workspace with a self-hosted coding assistant. Use when someone wants to start coding on a repo.
tools: [studio_list_assistants, studio_open_session]
tags: [workspace, coding, ide, cde, repo, develop]
inputs:
  repo:
  assistant: nova-coder
  kind: cde
---
# Open a dev workspace

Input `repo` is required (`owner/name` on your Gitea). `kind` is `cde` (cloud) or `ide`.

## Steps
1. list assistants
2. open session repo={repo} assistant={assistant} kind={kind}
