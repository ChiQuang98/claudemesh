---
name: git-conventions
description: Git best practices, commit message guidelines, and workflow patterns. Use when working with git or need guidance on git workflows.
allowed-tools: Bash
user-invocable: true
---

# Git Conventions

## Overview
Best practices and conventions for using git effectively in team environments.

## Conventional Commits

### Format
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types
- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, whitespace)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Code change that improves performance
- **test**: Adding missing tests or correcting existing tests
- **build**: Changes that affect the build system or external dependencies
- **ci**: Changes to CI configuration files and scripts
- **chore**: Other changes that don't modify src or test files

### Examples
```
feat(auth): add OAuth 2.0 authentication

Implement OAuth 2.0 login flow with Google and GitHub providers.
Includes token refresh logic and user profile sync.

Closes #123

fix(api): prevent race condition in user update

Add optimistic locking using version field to prevent concurrent
updates from overwriting each other.

Fixes #456

docs(readme): update installation instructions

BREAKING CHANGE: Node.js 18+ is now required
```

## Branch Naming

### Patterns
```
<type>/<ticket-id>-<short-description>

Examples:
feature/AUTH-123-oauth-login
fix/BUG-456-race-condition
hotfix/PROD-789-payment-error
```

### Best Practices
- Use lowercase
- Use hyphens, not underscores
- Include ticket/issue ID when available
- Keep it short but descriptive
- Avoid special characters

## Commit Best Practices

### Atomic Commits
Each commit should represent one logical change:
```bash
# Good - Atomic commits
git add auth/login.ts
git commit -m "feat(auth): add login endpoint"

git add auth/logout.ts
git commit -m "feat(auth): add logout endpoint"

# Bad - Mixed changes
git add auth/*.ts
git commit -m "feat(auth): add auth stuff"
```

### Commit Messages
**Subject Line:**
- Max 50 characters
- Start with lowercase (after type)
- No period at the end
- Use imperative mood: "add" not "added"

**Body:**
- Wrap at 72 characters
- Explain what and why, not how
- Separate from subject with blank line

**Footer:**
- Reference issues: "Closes #123"
- Note breaking changes: "BREAKING CHANGE: ..."

### Example Workflow
```bash
# 1. Create feature branch
git checkout -b feature/add-user-profile

# 2. Make changes and commit atomically
git add src/profile/view.tsx
git commit -m "feat(profile): add profile view component"

git add src/profile/edit.tsx
git commit -m "feat(profile): add profile edit form"

git add src/profile/api.ts
git commit -m "feat(profile): add profile API client"

# 3. Keep branch updated
git fetch origin
git rebase origin/main

# 4. Push to remote
git push origin feature/add-user-profile

# 5. Create pull request
```

## Git Workflows

### Feature Branch Workflow
```
main
  ├── feature/user-auth (dev 1)
  ├── feature/payment (dev 2)
  └── feature/notifications (dev 3)
```

1. Create feature branch from main
2. Work on feature with atomic commits
3. Open PR when ready
4. Merge after review
5. Delete feature branch

### Gitflow
```
main (production)
  └── develop (integration)
      ├── feature/new-feature
      ├── release/1.2.0
      └── hotfix/critical-bug
```

- **main**: Production-ready code
- **develop**: Integration branch
- **feature/**: New features (from develop)
- **release/**: Release preparation (from develop)
- **hotfix/**: Emergency fixes (from main)

## Merge vs Rebase

### Merge
```bash
git merge feature-branch
```
✅ Use when:
- You want to preserve branch history
- Working with shared branches
- Branch has meaningful commit structure

### Rebase
```bash
git rebase main
```
✅ Use when:
- You want linear history
- Branch is local/not shared
- Cleaning up before PR

❌ Never rebase:
- Public/shared branches
- After pushing to shared remote
- Main/master branch

## Undoing Changes

### Unstage Files
```bash
git reset HEAD <file>
```

### Discard Local Changes
```bash
git checkout -- <file>
# or
git restore <file>
```

### Amend Last Commit
```bash
git commit --amend
```

### Undo Last Commit (Keep Changes)
```bash
git reset --soft HEAD~1
```

### Undo Last Commit (Discard Changes)
```bash
git reset --hard HEAD~1
```

### Revert Commit (Create New Commit)
```bash
git revert <commit-hash>
```

## .gitignore Best Practices

### Common Patterns
```
# Dependencies
node_modules/
vendor/

# Build outputs
dist/
build/
*.log

# Environment
.env
.env.local
*.key

# IDE
.vscode/
.idea/
*.swp

# OS
.DS_Store
Thumbs.db
```

### Specific Patterns
```
# Ignore all .txt files
*.txt

# Except this one
!important.txt

# Ignore in all directories
**/logs/

# Ignore only in root
/config.local.js
```

## Git Hooks

### Pre-commit
```bash
#!/bin/sh
# Run linter before commit
npm run lint
```

### Commit-msg
```bash
#!/bin/sh
# Validate commit message format
commit_msg_file=$1
commit_msg=$(cat "$commit_msg_file")

# Check format
if ! echo "$commit_msg" | grep -qE "^(feat|fix|docs|style|refactor|perf|test|build|ci|chore)(\(.+\))?: .+"; then
  echo "Error: Commit message must follow conventional commits format"
  exit 1
fi
```

## Security

### Never Commit
- ❌ Passwords or API keys
- ❌ Private keys or certificates
- ❌ Database credentials
- ❌ AWS/cloud credentials
- ❌ Personal information

### If You Accidentally Commit Secrets
```bash
# Remove from history
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch path/to/secret-file" \
  --prune-empty --tag-name-filter cat -- --all

# Force push (careful!)
git push origin --force --all

# Rotate the compromised secrets immediately!
```

## Git Aliases

Add to `~/.gitconfig`:
```
[alias]
  co = checkout
  br = branch
  ci = commit
  st = status
  unstage = reset HEAD --
  last = log -1 HEAD
  visual = log --graph --oneline --all
  amend = commit --amend --no-edit
```

## Best Practices Summary

✅ **Do:**
- Write clear, descriptive commit messages
- Make atomic commits
- Review changes before committing
- Keep branches up to date
- Delete merged branches
- Use .gitignore properly
- Pull before push

❌ **Don't:**
- Commit directly to main
- Mix unrelated changes
- Commit broken code
- Push secrets or credentials
- Rebase public branches
- Force push shared branches
- Commit generated files
