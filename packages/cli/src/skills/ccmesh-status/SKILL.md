---
name: ccmesh-status
description: Check project health, installed domains, and identify potential issues. Quick project overview.
allowed-tools: Bash, Read, Glob, Grep
user-invocable: true
---

# ClaudeMesh Project Status

When this skill is invoked, provide a comprehensive status report of the project.

## Step 1: Git Status

```bash
# Current branch and status
git branch --show-current 2>/dev/null
git status --short 2>/dev/null | head -20

# Recent commits
git log --oneline -5 2>/dev/null
```

## Step 2: Project Health

### Check for common issues

```bash
# Uncommitted changes
git diff --stat 2>/dev/null | tail -5

# Untracked files
git ls-files --others --exclude-standard 2>/dev/null | head -10
```

### Dependencies status

```bash
# Node.js
[ -f package.json ] && echo "Node.js project detected"
[ -d node_modules ] && echo "Dependencies installed" || echo "WARNING: node_modules missing"

# Check for lock file
[ -f pnpm-lock.yaml ] && echo "Using pnpm"
[ -f package-lock.json ] && echo "Using npm"
[ -f yarn.lock ] && echo "Using yarn"
```

## Step 3: ClaudeMesh Status

### Check installed domains

```bash
# Check local .claude directory
[ -d .claude ] && echo "Local .claude/ found" || echo "No local .claude/"
[ -f .claude/claudemesh.json ] && cat .claude/claudemesh.json

# Count agents and skills
find .claude/agents -name "*.md" 2>/dev/null | wc -l
find .claude/skills -name "SKILL.md" 2>/dev/null | wc -l
```

### List installed agents

```bash
ls -la .claude/agents/*.md 2>/dev/null | head -10
```

### List installed skills

```bash
find .claude/skills -name "SKILL.md" -exec dirname {} \; 2>/dev/null | xargs -I{} basename {}
```

## Step 4: Build Status

```bash
# Check if dist exists and is recent
[ -d dist ] && ls -la dist/ | head -5
[ -d build ] && ls -la build/ | head -5
[ -d .next ] && echo "Next.js build exists"
```

## Step 5: Test Status

```bash
# Check for test files
find . -name "*.test.ts" -o -name "*.spec.ts" -o -name "*.test.js" 2>/dev/null | wc -l
find . -name "__tests__" -type d 2>/dev/null | head -5
```

## Output Format

```
=== ClaudeMesh Project Status ===

Git:
  Branch: main
  Status: Clean / 3 uncommitted files
  Last commit: abc1234 - feat: add feature (2 hours ago)

Project:
  Type: Node.js (pnpm)
  Dependencies: Installed
  Build: Up to date

ClaudeMesh:
  Agents: 5 installed
  Skills: 3 installed
  Domains: git, backend-node

Health Checks:
  [OK] Dependencies installed
  [OK] No TypeScript errors
  [WARN] 2 outdated dependencies
  [WARN] Missing tests for 3 files

Quick Actions:
  - Run `pnpm update` to update dependencies
  - Run `pnpm test` to verify tests pass
```

## Quick Mode

If user specifies `--quick`:
- Only show git status
- Only show critical issues
- Skip detailed analysis
