---
mode: 'agent'
description: 'Rewrite a memory/instructions file (CLAUDE.md, SKILL.md, copilot-instructions.md, etc.) into caveman-compressed style, cutting input tokens every future session that loads it.'
---

# /caveman-compress <file>

Rewrite the target file (path given by user, or ask if not provided) into caveman
style, in place:

- Drop articles/filler/pleasantries from prose exactly like the `caveman` skill's rules
- Preserve byte-for-byte: code blocks, file paths, URLs, YAML frontmatter keys/values,
  command names, flag names
- Keep all headings and structure — compress the prose under each, don't delete sections
- Do not lose any rule, constraint, or conditional logic — compression must not change
  meaning or drop edge cases
- Read the file first, show a brief before/after word-count estimate after editing
- If the file is machine-parsed YAML/JSON frontmatter, never touch it — only compress
  markdown prose bodies
