---
mode: 'agent'
description: 'Dispatch multiple independent tasks as parallel subagents. Use when 2+ tasks have separate root causes, do not edit the same files, and have no sequential dependencies.'
---

# Dispatching Parallel Agents

Use parallel subagents only for truly independent work.

## Decision Gate

Use parallel dispatch only when ALL are true:
- Problems have separate root causes
- Tasks do not edit the same files
- Tasks do not require shared intermediate state

**Do NOT use when:**
- Failures might be related (fixing one might fix others)
- Task is exploratory (you don't know what's broken yet)
- Agents would edit the same files or shared resources
- Task requires seeing the full system state
- Goal is to fetch raw content (file contents, API responses) — agent results are compressed; raw content will be lost. Fetch directly instead.

## Procedure

1. Split work into independent domains
2. Write one focused prompt per domain
3. Dispatch ALL agents in a **single response** with parallel calls — never stagger across multiple messages (staggering delays starts, wastes cache TTL)
4. Collect summaries and changed files from all agents
5. Resolve any conflicts between agent outputs
6. Run full integration verification — do not mark the wave complete until it passes

## Per-Agent Prompt Requirements

Each subagent prompt must include ONLY:
- Exact scope (what to do and what NOT to touch)
- Acceptance criteria (how to know it's done)
- File constraints (which files are in scope)
- Verification command

**Do NOT include:** parent conversation history, reasoning chains from other agents, or context not needed for this specific task. Keep each prompt small — subagents share a cached system prefix; unique large prefixes break cache sharing and multiply costs.

## After All Agents Complete

1. Review each agent's summary
2. Check for file conflicts (two agents modifying the same file)
3. Run the full project test suite
4. Fix any integration failures before declaring the wave done
