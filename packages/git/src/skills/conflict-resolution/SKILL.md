---
name: conflict-resolution
description: Merge conflict resolution strategies and patterns. Use when dealing with merge conflicts or need guidance on conflict resolution.
allowed-tools: Bash, Read
user-invocable: true
---

# Conflict Resolution

## Overview
Strategies and techniques for resolving git merge conflicts effectively.

## Understanding Conflicts

### What Causes Conflicts?
Conflicts occur when:
- Same lines are modified in different branches
- File is modified in one branch, deleted in another
- File is renamed in one branch, modified in another
- Binary files are modified in both branches

### Conflict Markers
```
<<<<<<< HEAD
Your changes (current branch)
=======
Their changes (incoming branch)
>>>>>>> branch-name
```

## Resolution Strategies

### 1. Visual Inspection
```bash
# See conflicted files
git status

# View conflict markers
git diff

# View differences
git diff --ours <file>    # Your version
git diff --theirs <file>  # Their version
```

### 2. Choose One Side
```bash
# Keep your changes
git checkout --ours <file>
git add <file>

# Keep their changes
git checkout --theirs <file>
git add <file>
```

### 3. Manual Resolution
Open file and edit to combine changes logically:

**Before:**
```javascript
<<<<<<< HEAD
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}
=======
function calculateTotal(items) {
  const tax = 0.1;
  return items.reduce((sum, item) => sum + item.price * (1 + tax), 0);
}
>>>>>>> feature/add-tax
```

**After:**
```javascript
function calculateTotal(items, includeTax = true) {
  const tax = includeTax ? 0.1 : 0;
  return items.reduce((sum, item) => sum + item.price * (1 + tax), 0);
}
```

### 4. Use Merge Tool
```bash
# Configure merge tool (one-time)
git config --global merge.tool vscode

# Launch merge tool
git mergetool
```

## Common Conflict Patterns

### Pattern 1: Independent Changes
**Scenario:** Both sides add different features

**Solution:** Keep both changes
```javascript
// HEAD
function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

// Incoming
function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}

// Resolution: Keep both
function validateEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
}

function validatePhone(phone) {
  return /^\d{10}$/.test(phone);
}
```

### Pattern 2: Conflicting Modifications
**Scenario:** Same function modified differently

**Solution:** Combine improvements
```javascript
// HEAD: Added validation
function createUser(name, email) {
  if (!email) throw new Error('Email required');
  return { name, email };
}

// Incoming: Added timestamp
function createUser(name, email) {
  return { name, email, createdAt: new Date() };
}

// Resolution: Combine both improvements
function createUser(name, email) {
  if (!email) throw new Error('Email required');
  return { name, email, createdAt: new Date() };
}
```

### Pattern 3: Renamed vs Modified
**Scenario:** File renamed in one branch, modified in another

**Solution:**
```bash
# Apply changes to new filename
git checkout --theirs <old-name>
git mv <old-name> <new-name>
git add <new-name>
```

### Pattern 4: Deleted vs Modified
**Scenario:** File deleted in one branch, modified in another

**Solution:** Decide based on intent
```bash
# If deletion was intentional
git rm <file>

# If modifications should be kept
git add <file>
```

## Workflow Steps

### During Merge
```bash
# 1. Attempt merge
git merge feature-branch
# Auto-merging file.js
# CONFLICT (content): Merge conflict in file.js

# 2. See what's conflicted
git status
# Both modified:   file.js

# 3. View conflicts
git diff
# Or open in editor

# 4. Resolve conflicts
# Edit file to resolve

# 5. Mark as resolved
git add file.js

# 6. Complete merge
git commit
```

### During Rebase
```bash
# 1. Start rebase
git rebase main
# CONFLICT: ...

# 2. Resolve conflicts
# Edit files

# 3. Stage resolved files
git add <resolved-files>

# 4. Continue rebase
git rebase --continue

# Or abort if needed
git rebase --abort
```

## Prevention Strategies

### 1. Communicate
- Coordinate changes with team
- Avoid working on same files simultaneously
- Use code reviews to spot potential conflicts early

### 2. Small, Frequent Merges
```bash
# Regularly update feature branch
git checkout feature-branch
git merge main
# Or git rebase main
```

### 3. Modular Code
- Keep functions small and focused
- Use clear separation of concerns
- Minimize dependencies between files

### 4. Clear Ownership
- Assign file/module ownership
- Use CODEOWNERS file
- Review changes that cross boundaries

## Advanced Techniques

### Interactive Rebase to Avoid Conflicts
```bash
# Clean up commits before merging
git rebase -i main

# Options:
# pick - keep commit as is
# squash - combine with previous
# drop - remove commit
# edit - modify commit
```

### Cherry-Pick Specific Changes
```bash
# Apply specific commit from another branch
git cherry-pick <commit-hash>

# If conflicts occur, resolve and continue
git cherry-pick --continue
```

### Three-Way Merge Understanding
```bash
# View base version (common ancestor)
git show :1:<file>

# View our version
git show :2:<file>

# View their version
git show :3:<file>
```

## Tools and Editors

### VS Code
```bash
# Configure as merge tool
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# Use
git mergetool
```

### Vim/Neovim
```vim
" Navigate conflicts
]c - next conflict
[c - previous conflict

" Choose version
:diffget LOCAL    " or :do
:diffget REMOTE   " or :dp
```

### Command Line
```bash
# Show conflict summary
git diff --name-only --diff-filter=U

# Show conflict details
git diff --check
```

## Best Practices

✅ **Do:**
- Read and understand both sides before resolving
- Test after resolving conflicts
- Commit atomic changes to minimize conflicts
- Keep branches short-lived
- Merge/rebase main frequently
- Use merge tools when conflicts are complex
- Document complex resolutions in commit message

❌ **Don't:**
- Blindly accept one side without review
- Delete conflict markers without resolving
- Commit conflicts (yes, it's possible by mistake!)
- Ignore compiler/test failures after resolution
- Resolve conflicts in code you don't understand
- Force push without team communication

## Conflict Resolution Checklist

After resolving conflicts:
- [ ] All conflict markers removed
- [ ] Code compiles/runs without errors
- [ ] Tests pass
- [ ] Linter passes
- [ ] Logic makes sense
- [ ] Both changes are properly integrated
- [ ] No duplicate code introduced
- [ ] Code review requested if unsure

## Emergency: Undo Resolution

### Restart Merge
```bash
git merge --abort
```

### Restart Rebase
```bash
git rebase --abort
```

### Undo Last Commit
```bash
git reset --hard HEAD~1
```

### Recover Original File
```bash
# Before merge completion
git checkout HEAD <file>
```

## Examples

### Example 1: Package.json Conflict
```json
<<<<<<< HEAD
{
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^1.0.0"
  }
}
=======
{
  "dependencies": {
    "react": "^18.0.0",
    "lodash": "^4.17.21"
  }
}
>>>>>>> feature/add-lodash
```

**Resolution:** Merge dependencies
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^1.0.0",
    "lodash": "^4.17.21"
  }
}
```

### Example 2: Import Conflict
```typescript
<<<<<<< HEAD
import { useState, useEffect } from 'react';
import { api } from './api';
=======
import { useState, useCallback } from 'react';
import { api } from './api';
>>>>>>> feature/add-callback
```

**Resolution:** Merge imports
```typescript
import { useState, useEffect, useCallback } from 'react';
import { api } from './api';
```

### Example 3: Logic Conflict
```typescript
<<<<<<< HEAD
function processOrder(order) {
  validateOrder(order);
  return saveOrder(order);
}
=======
function processOrder(order) {
  logOrder(order);
  return saveOrder(order);
}
>>>>>>> feature/add-logging
```

**Resolution:** Combine both operations
```typescript
function processOrder(order) {
  validateOrder(order);
  logOrder(order);
  return saveOrder(order);
}
```

Remember: When in doubt, ask for help! Complex conflicts may require discussion with the original authors.
