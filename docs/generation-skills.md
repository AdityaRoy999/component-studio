# Skills for component generation

Use the book/check icon in the home composer or immediately before **Preview / Code** in the workspace. Choose a Studio frontend preset, or open **Custom SKILL.md** to upload or paste your own instructions. Review the file and choose **Use skill**. **No skill** clears the selection.

The six original Studio presets cover frontend design, accessibility, motion, responsive layouts, design systems, and React craft. These are self-contained instruction files, separate from the browsable Skills directory. The picker can download any preset as `SKILL.md`.

## Standard format

The files follow the [Agent Skills specification](https://agentskills.io/specification): YAML frontmatter with `name` and `description`, followed by Markdown instructions. A portable skill has this minimum layout:

```text
my-frontend-skill/
└── SKILL.md
```

```markdown
---
name: my-frontend-skill
description: Build compact, accessible frontend components. Use for cards, forms, and navigation.
metadata:
  author: Your name
  version: "1.0"
---

# My frontend skill

## Instructions
- Use neutral surfaces and a restrained accent.
- Keep controls accessible by keyboard.
- Support narrow layouts, both themes, and reduced motion.

## Review
Check default props, long labels, and all interactive states.
```

Names use 1–64 lowercase letters, numbers, and single hyphens. Descriptions contain 1–1024 characters. Standard optional metadata fields are accepted and validated. Files must contain instructions and fit within the Studio limit of 32 KB. YAML aliases are not supported.

The standard also permits `references/`, `assets/`, and `scripts/`. This picker loads **one standalone Markdown file**; it does not load companion files, execute scripts, or grant tools through `allowed-tools`. Include the necessary guidance directly in your Markdown.

## How the AI uses it

Only the selected skill's instructions are included in the request to your configured model provider. They guide design and implementation while preserving explicit user requests and the studio's runtime and JSON output requirements. The same guidance reaches streamed generation and validation repairs on every supported provider.

The selection is saved in this browser, and each build turn records the skill used. Opening a saved build restores its selection; history backups include those instruction files. Changing the skill affects subsequent requests, including a retry or an edited message. It does not alter an in-flight request; selection changes are disabled during generation.

The skill text is sent through the app's server to your selected AI provider with your prompt. Use **No skill** to return to the normal generation defaults.
