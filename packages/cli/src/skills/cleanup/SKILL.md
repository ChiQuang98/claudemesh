---
name: cleanup
description: Guide Claude to identify and remove AI-generated markdown files. Use when cleaning up unnecessary AI-created files from the project.
allowed-tools: Read, Write, Edit, Bash
user-invocable: true
---

# AI-Generated File Cleanup

## Overview
This skill guides Claude to safely identify and remove AI-generated markdown (.md) files while preserving important project files.

## Safety First

### Files to NEVER Delete
```bash
# CRITICAL: Never delete these files
README.md
CONTRIBUTING.md
CHANGELOG.md
LICENSE
package.json
tsconfig.json
dbt_project.yml
profiles.yml
.gitignore
.prettierrc
.eslintrc

# In packages/
*/package.json          # Package definitions
*/README.md             # Package documentation
```

### Safe Deletion Patterns
```bash
# Generally safe to delete if AI-generated
- Temp analysis files
- Duplicate documentation
- Generated examples
- Test/output files
```

## Identification Process

### Step 1: Scan for Markdown Files
```bash
# Find all .md files in packages
find packages/ -name "*.md" -type f

# Count by package
find packages/* -name "*.md" | cut -d/ -f2 | sort | uniq -c
```

### Step 2: Check File Patterns
```bash
# List potentially AI-generated files
find packages/ -name "*.md" -type f | while read file; do
  # Check for AI indicators in content
  if grep -qi "here are\|below is\|i can see\|let me create\|ai language model" "$file" 2>/dev/null; then
    echo "POTENTIAL AI: $file"
  fi
done
```

### Step 3: Check File Size
```bash
# Very small .md files might be auto-generated stubs
find packages/ -name "*.md" -size -1k -type f
```

## Cleanup Procedure

### Before Deletion - Always Verify

**Checklist for each file:**
- [ ] Read the file content
- [ ] Confirm it's AI-generated
- [ ] Verify it's not documented elsewhere
- [ ] Check if it's referenced in package.json (files array)
- [ ] Ensure no important content
- [ ] Add to deletion list

### Read File Before Deciding
```bash
# Preview first 50 lines
head -n 50 path/to/file.md

# Check if it's referenced
grep -r "filename.md" packages/*/package.json
```

## Common AI-Generated File Patterns

### Temp Analysis Files
```bash
# Usually safe to delete:
*_analysis.md
temp_*.md
draft_*.md
*_backup.md
*_old.md
```

### Duplicate Documentation
```bash
# If content exists in both:
# - agents/xxx.md and skills/xxx/SKILL.md
# Keep the one in the proper location, delete duplicates
```

## Safe Deletion Commands

### Interactive Deletion (Recommended)
```bash
# Review each file before deleting
find packages/ -name "*.md" -type f | while read file; do
  echo "=== $file ==="
  head -n 20 "$file"
  echo ""
  read -p "Delete $file? (y/n): " answer
  if [ "$answer" = "y" ]; then
    rm "$file"
    echo "Deleted: $file"
  fi
done
```

### Dry Run Mode
```bash
# List what would be deleted without actually deleting
find packages/ -name "*.md" -type f | while read file; do
  if grep -qi "here are\|below is\|i can see\|let me create" "$file" 2>/dev/null; then
    echo "Would delete: $file"
  fi
done
```

### Batch Deletion (Use with Caution)
```bash
# ONLY after thorough review:
# Delete specific patterns (example only - customize)
find packages/ -name "temp_*.md" -type f -delete
find packages/ -name "draft_*.md" -type f -delete
```

## Package-Specific Rules

### ClaudeMesh Project Structure
```
packages/
├── cli/
│   ├── src/
│   │   └── agents/          # KEEP: CLI agent definitions
│   └── README.md             # KEEP: Package docs
├── database-optimization/
│   ├── src/
│   │   ├── agents/          # KEEP: Agent .md files
│   │   └── skills/          # KEEP: SKILL.md files
│   └── README.md             # KEEP: Package docs
└── [other packages]/
    └── ...                   # Same pattern
```

### Files to Keep
```bash
# Agent definitions (in src/agents/)
packages/*/src/agents/*.md

# Skill definitions (in src/skills/*/)
packages/*/src/skills/*/SKILL.md

# Package documentation
packages/*/README.md

# Configuration files
packages/*/*.yml
packages/*/*.json
```

## Verification After Deletion

### Check Package Integrity
```bash
# Verify each package still has required files
for pkg in packages/*/; do
  echo "=== Checking $pkg ==="
  [ -f "$pkg/package.json" ] && echo "✓ package.json"
  [ -f "$pkg/README.md" ] && echo "✓ README.md"
  [ -d "$pkg/src/agents" ] && echo "✓ agents/ exists"
  [ -d "$pkg/src/skills" ] && echo "✓ skills/ exists"
done
```

### Check for Broken References
```bash
# If CLI uses references to agents/skills
# Check for consistency
find packages/cli -name "*.md" -o -name "*.ts" | xargs grep -l "packages/"
```

## Decision Framework

### Should I Delete This File?

**Ask these questions:**

1. **Is it in src/agents/ or src/skills/?**
   - YES → Keep it (it's part of the package content)
   - NO → Continue to next question

2. **Is it README.md or package.json?**
   - YES → Keep it (package metadata)
   - NO → Continue to next question

3. **Does it contain actual agent/skill content?**
   - YES → Keep it
   - NO → Consider deletion

4. **Is it a temporary/analysis file?**
   - YES → Safe to delete
   - NO → Investigate further

5. **Is it a duplicate?**
   - YES → Delete duplicate
   - NO → Keep it

## Examples

### Safe to Delete
```bash
# These are typically AI-generated analysis files:
packages/cli/src/agents/architecture_analysis.md
packages/frontend-react/src/IMPLEMENTATION_PLAN.md
packages/python-data/src/testing_approach.md

# Exception: Unless they contain documented, finalized content
```

### Must Keep
```bash
# Agent definitions
packages/database-optimization/src/agents/query-optimizer.md
packages/frontend-react/src/agents/react-architect.md

# Skill definitions
packages/database-optimization/src/skills/query-patterns/SKILL.md
packages/frontend-react/src/skills/component-patterns/SKILL.md
```

## Rollback Safety

### Use Version Control
```bash
# Before cleanup, create a safety branch
git checkout -b backup-before-cleanup

# Or stash current changes
git stash save "backup before cleanup"

# After cleanup, if something goes wrong:
git checkout backup-before-cleanup
# or
git stash pop
```

### Review Before Commit
```bash
# See what would be deleted
git status

# Review each deletion
git diff --cached

# Commit with clear message
git commit -m "chore: remove AI-generated temp files

- Removed temporary analysis files
- Kept all agent and skill definitions
- Verified package integrity"
```

## Best Practices

### ✅ DO:
- Always read file content before deleting
- Use version control safety net
- Delete in small batches
- Verify after each batch
- Check for file references
- Document what was deleted and why
- Keep agents/ and skills/ content
- Preserve README.md files

### ❌ DON'T:
- Delete files blindly by pattern
- Remove files from src/agents/
- Remove files from src/skills/
- Delete package.json or README.md
- Skip verification step
- Delete without git backup
- Batch delete large numbers at once
- Assume all .md files are temporary

## Quick Reference Command

### One-Time Cleanup Script
```bash
# Interactive cleanup with prompts
cleanup_ai_files() {
  echo "=== AI-Generated File Cleanup ==="
  echo "This will scan for potential AI-generated .md files"
  echo ""

  # Find and review each file
  find packages/ -name "*.md" -type f | while read file; do
    # Skip important files
    case "$file" in
      */README.md|*/package.json|*/SKILL.md)
        continue
        ;;
    esac

    # Check for AI patterns
    if grep -qi "here are\|below is\|i can see\|let me create\|based on the exploration" "$file" 2>/dev/null; then
      echo "Found AI-generated file: $file"
      echo "First 20 lines:"
      head -n 20 "$file"
      echo ""
      read -p "Delete this file? (y/n): " answer
      if [ "$answer" = "y" ]; then
        rm "$file"
        echo "✓ Deleted: $file"
      else
        echo "✗ Kept: $file"
      fi
      echo ""
    fi
  done

  echo "=== Cleanup Complete ==="
  echo "Review changes with: git status"
}

# Run the function
cleanup_ai_files
```

## Troubleshooting

### Accidentally Deleted Important File

```bash
# Recover from git
git checkout HEAD -- path/to/file.md

# Or from specific commit
git log --oneline --all  # Find commit
git checkout <commit-hash> -- path/to/file.md
```

### Verify Package Still Works

```bash
# List all agents/skills after cleanup
find packages/ -path "*/src/agents/*.md" -o -path "*/src/skills/*/SKILL.md" | sort

# Should see proper structure:
# packages/database-optimization/src/agents/query-optimizer.md
# packages/database-optimization/src/skills/query-patterns/SKILL.md
# etc.
```
