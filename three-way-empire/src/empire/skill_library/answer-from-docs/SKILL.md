---
name: answer-from-docs
description: Answer a question from the client's own documents in the knowledge base, with citations. Use for policy, handbook, product or how-do-we questions.
tools: [knowledge_ask]
tags: [docs, knowledge, policy, handbook, faq, answer]
inputs:
  question:
---
# Answer from docs

Input `question` is required. The answer quotes only the client's own documents and
cites them like [1]. If the documents don't cover it, the skill says so instead of guessing.

## Steps
1. ask {question}
