---
name: retire-deployment
description: Stop a running deployment and confirm its compute was released. Use to shut down, retire or tear down a deployment.
tools: [factory_teardown, factory_list_pools]
tags: [retire, teardown, shutdown, stop, decommission]
inputs:
  deployment_id:
---
# Retire a deployment

Input `deployment_id` is required (from the deployment list or the client's record).

## Steps
1. teardown deployment_id={deployment_id}
2. show pool capacity
