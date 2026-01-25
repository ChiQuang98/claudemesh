---
name: ccmesh-fix
description: Auto-fix common issues like linting errors, formatting, and simple code problems. Quick cleanup.
allowed-tools: Bash, Read, Write, Edit
user-invocable: true
---

# ClaudeMesh Auto-Fix

When this skill is invoked, automatically fix common issues in the project.

## Step 1: Identify Project Type

```bash
# Detect project type
[ -f package.json ] && echo "nodejs"
[ -f requirements.txt ] && echo "python"
[ -f go.mod ] && echo "go"
[ -f Cargo.toml ] && echo "rust"
```

## Step 2: Run Available Fixers

### For Node.js/TypeScript Projects

```bash
# Format code with Prettier (if available)
[ -f node_modules/.bin/prettier ] && npx prettier --write "**/*.{ts,tsx,js,jsx,json,md}" 2>/dev/null

# Fix ESLint issues (if available)
[ -f node_modules/.bin/eslint ] && npx eslint --fix "**/*.{ts,tsx,js,jsx}" 2>/dev/null

# Fix TypeScript issues (compile check)
[ -f tsconfig.json ] && npx tsc --noEmit 2>&1 | head -20
```

### For Python Projects

```bash
# Format with Black (if available)
which black && black . 2>/dev/null

# Sort imports with isort (if available)
which isort && isort . 2>/dev/null

# Fix with autopep8 (if available)
which autopep8 && autopep8 --in-place --recursive . 2>/dev/null
```

## Step 3: Common Fixes

### Fix file permissions

```bash
# Remove execute permission from non-script files
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.json" \) -perm +111 -exec chmod -x {} \;
```

### Fix line endings

```bash
# Convert CRLF to LF (Unix style)
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) -exec sed -i '' 's/\r$//' {} \; 2>/dev/null
```

### Fix trailing whitespace

```bash
# Remove trailing whitespace
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.md" \) -exec sed -i '' 's/[[:space:]]*$//' {} \; 2>/dev/null
```

### Fix missing newline at end of file

Files should end with a newline character.

## Step 4: Git Cleanup

```bash
# Remove untracked .DS_Store and similar
git clean -f -X -- ".DS_Store" "Thumbs.db" 2>/dev/null
```

## Step 5: Dependency Fixes

### Node.js

```bash
# Deduplicate dependencies
npm dedupe 2>/dev/null || pnpm dedupe 2>/dev/null

# Fix audit issues (non-breaking)
npm audit fix 2>/dev/null || pnpm audit --fix 2>/dev/null
```

## Auto-Fixable Issues

These issues can be automatically fixed:

| Issue | Fix |
|-------|-----|
| Formatting | Prettier/Black |
| Import order | ESLint/isort |
| Trailing whitespace | sed |
| Line endings | sed |
| Simple lint errors | ESLint --fix |
| Missing semicolons | ESLint --fix |
| Unused imports | ESLint --fix |

## Non-Fixable Issues (Report Only)

These issues require manual intervention:

- Type errors
- Logic errors
- Security vulnerabilities
- Breaking dependency updates
- Missing tests

## Output Format

```
=== ClaudeMesh Auto-Fix ===

Running fixes...

[FIX] Prettier: Formatted 15 files
[FIX] ESLint: Fixed 8 issues in 4 files
[FIX] Removed 3 .DS_Store files
[SKIP] No Python files found

Summary:
  Fixed: 26 issues
  Skipped: 2 (manual fix required)

Manual fixes needed:
  1. src/index.ts:45 - Type error: Property 'foo' does not exist
  2. src/utils.ts:12 - Unused variable 'temp'

Run `git diff` to review changes before committing.
```

## Options

- `--dry-run` - Show what would be fixed without making changes
- `--format` - Only run formatters (Prettier/Black)
- `--lint` - Only run linters with auto-fix
- `--all` - Run all available fixers

## Safety

- Always shows what changes were made
- Never modifies files in node_modules or .git
- Creates no new files (only modifies existing)
- Respects .gitignore and .prettierignore
