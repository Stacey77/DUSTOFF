---
name: launch-new-app
description: Scaffold a new app from a Foundry blueprint and confirm there is compute to run it. Use when a client wants a new app, bot or assistant built.
tools: [foundry_list_blueprints, foundry_scaffold_app, factory_list_pools]
tags: [launch, scaffold, new app, build, create]
inputs:
  app_name: new-app
  blueprint: rag-assistant
---
# Launch a new app

Inputs: `app_name` (lowercase, no spaces) and `blueprint`
(`rag-assistant`, `support-bot`, `doc-extractor`, `agent-workflow`).

## Steps
1. list blueprints
2. scaffold app name={app_name} blueprint={blueprint}
3. show pool capacity
