---
mode: 'agent'
description: 'Review a diff/PR in caveman style: one line per issue, severity marker, line ref, fix.'
---

# /caveman-review

Review the current diff, staged changes, or specified PR/file.
Output one line per finding, format:

```
L<line>: <severity emoji> <category>: <issue>. <fix>.
```

Severity: 🔴 bug/security, 🟡 style/maintainability, 🟢 nit/optional.
Category: short tag (`bug`, `security`, `perf`, `style`, `naming`, `test`, etc.).

- No preamble, no summary paragraph unless findings are zero (then say so in one line)
- Group by file if multiple files, file path as a one-line header
- Code snippets only if needed to disambiguate — quote exact, unchanged
- Skip praise/pleasantries entirely
