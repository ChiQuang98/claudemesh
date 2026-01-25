---
name: ccmesh-clean
description: Clean AI-generated temporary files, analysis files, and drafts from the project. Use to tidy up after AI sessions.
allowed-tools: Bash, Read, Glob, Grep
user-invocable: true
---

# ClaudeMesh Cleanup

When this skill is invoked, immediately perform the following cleanup actions.

## Step 1: Scan for Cleanup Candidates

Find files that are typically AI-generated or temporary:

```bash
# Find potential cleanup candidates
find . -type f \( \
  -name "*.tmp" -o \
  -name "*.temp" -o \
  -name "*_draft*.md" -o \
  -name "*_analysis*.md" -o \
  -name "*_backup*" -o \
  -name "temp_*.md" -o \
  -name "draft_*.md" -o \
  -name "*_old.*" -o \
  -name "*.bak" -o \
  -name "*~" -o \
  -name ".DS_Store" -o \
  -name "Thumbs.db" -o \
  -name "*.log" -o \
  -name "*.orig" \
\) 2>/dev/null | head -50
```

## Step 2: Find AI-Generated Markdown Files

Search for markdown files with AI-generated content patterns:

```bash
# Files with AI language patterns
grep -rl --include="*.md" -E "(Here('s| is) (a|an|the)|Let me|I('ll| will)|Based on (my|the)|As an AI)" . 2>/dev/null | head -20
```

## Step 3: Protected Files (NEVER DELETE)

These files must NEVER be deleted regardless of content:

- `README.md` - Project documentation
- `CHANGELOG.md` - Change history
- `CONTRIBUTING.md` - Contribution guide
- `LICENSE` - License file
- `package.json` - Package manifest
- `tsconfig.json` - TypeScript config
- `**/src/agents/*.md` - Agent definitions
- `**/src/skills/*/SKILL.md` - Skill definitions
- `.gitignore` - Git ignore rules
- Any file in `.git/`

## Step 4: Cleanup Actions

For each candidate file found, check if it's protected. If not protected:

1. **Show the file path and first 10 lines**
2. **Ask user for confirmation** before deleting
3. **Delete only after explicit approval**

## Automatic Safe Deletions

These can be deleted without asking (system files):
- `.DS_Store`
- `Thumbs.db`
- `*.orig` (git merge artifacts)
- `*~` (editor backup files)

## Report Summary

After cleanup, report:
- Files scanned
- Files deleted
- Space recovered (if significant)
- Protected files skipped

## Example Output Format

```
=== ClaudeMesh Cleanup ===

Scanning for cleanup candidates...

Found 5 files:

1. ./temp_analysis.md (AI-generated analysis)
   Preview: "Here's my analysis of the codebase..."
   [Delete? y/n]

2. ./packages/cli/draft_readme.md (draft file)
   Preview: "# Draft README..."
   [Delete? y/n]

3. ./.DS_Store (system file)
   Auto-deleted

=== Cleanup Complete ===
- Scanned: 156 files
- Deleted: 3 files
- Skipped: 2 protected files
- Space recovered: 24 KB
```

## Quick Mode

If user specifies `--quick` or `quick`, only delete obvious temp files without prompting:
- `*.tmp`, `*.temp`, `*.bak`, `*~`
- `.DS_Store`, `Thumbs.db`
- `*.orig`, `*.log` (if not in important directories)
