# Publishing Guide for ClaudeMesh

This guide walks you through publishing ClaudeMesh packages to npm.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Pre-Publishing Checklist](#pre-publishing-checklist)
- [Step-by-Step Publishing](#step-by-step-publishing)
- [Post-Publishing Verification](#post-publishing-verification)
- [Version Management](#version-management)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### 1. Create npm Account

If you don't have one: https://www.npmjs.com/signup

### 2. Login to npm

```bash
npm login
# Enter your username, password, and email
```

Verify you're logged in:

```bash
npm whoami
# Should display your username
```

### 3. Install Build Tools

```bash
# Install pnpm (recommended)
npm install -g pnpm

# OR use npm (comes with Node.js)
```

## Pre-Publishing Checklist

### Check Package Name Availability

```bash
npm view @claudemesh/cli
npm view @claudemesh/git
npm view @claudemesh/backend-node
npm view @claudemesh/database-optimization
```

**Expected result:** Each should return `404 Not Found` (name is available)

### Update Package Metadata

For each package in `packages/*/`, ensure `package.json` has:

```json
{
  "name": "@claudemesh/package-name",
  "version": "1.0.0",
  "description": "Clear description of what this package does",
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "keywords": ["claude-code", "cli", "agents", "skills"],
  "repository": {
    "type": "git",
    "url": "git+https://github.com/your-username/claudemesh.git"
  },
  "bugs": {
    "url": "https://github.com/your-username/claudemesh/issues"
  },
  "homepage": "https://github.com/your-username/claudemesh#readme"
}
```

**IMPORTANT:** Remove `"private": true` from all `package.json` files!

### Add README.md to Each Package

Each package should have its own README.md:

```markdown
# @claudemesh/package-name

Brief description of this domain package.

## Installation

```bash
claudemesh add package-name
```

## What's Included

### Agents
- List agents and their purposes

### Skills
- List skills and their purposes

## Usage

Example usage with Claude Code.
```

### Create .npmignore Files

Add `.npmignore` to each package directory to exclude dev files:

```
src/
tsconfig.json
*.ts
!dist/
.DS_Store
*.log
.vscode/
.idea/
```

## Step-by-Step Publishing

### Step 1: Build All Packages

```bash
cd /path/to/claudemesh

# Clean previous builds
pnpm run clean  # or manually: rm -rf packages/*/dist

# Install dependencies
pnpm install

# Build all packages
pnpm build
```

Verify builds succeeded:

```bash
ls packages/cli/dist/
ls packages/git/dist/
ls packages/backend-node/dist/
```

### Step 2: Publish CLI Package (First)

The CLI package must be published first since other packages depend on it.

```bash
cd packages/cli

# Dry run to check for issues
npm publish --dry-run

# Actually publish
npm publish

# You should see output like:
# @claudemesh/cli@1.0.0
```

### Step 3: Publish Domain Packages

Publish in order of dependency:

```bash
# Git package (no dependencies)
cd ../git
npm publish

# Backend Node package (no dependencies)
cd ../backend-node
npm publish

# Database Optimization package
cd ../database-optimization
npm publish

# Continue with other packages...
```

### Step 4: Verify Published Packages

```bash
# Check each package on npm
npm view @claudemesh/cli
npm view @claudemesh/git
npm view @claudemesh/backend-node

# Or visit in browser:
# https://www.npmjs.com/package/@claudemesh/cli
```

## Post-Publishing Verification

### 1. Clean Test Installation

Create a fresh test project:

```bash
# Go to a clean directory
cd ~
mkdir test-claudemesh-publish
cd test-claudemesh-publish

# Initialize
claudemesh init

# Add a domain
claudemesh add git

# Verify
claudemesh list
claudemesh validate

# Check files were created
ls .claude/agents/
ls .claude/skills/
```

### 2. Test with Claude Code

```bash
# Test agent is available
claude --agent commit-expert -p "What is a conventional commit?"

# Verify the agent responds with expertise from your package
```

### 3. Clean Up

```bash
cd ~
rm -rf test-claudemesh-publish
```

## Version Management

### Semantic Versioning

Follow semver: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Updating Versions

1. Update version in all `package.json` files:

```bash
# Using npm version
cd packages/cli
npm version minor  # or major, or patch

# Or manually edit package.json
```

2. Update CHANGELOG.md with changes

3. Rebuild and republish:

```bash
pnpm build
cd packages/cli
npm publish
```

### Synchronizing Versions

For monorepo, keep all packages at same version:

```bash
# Update all at once
npm version minor --workspaces --include-workspace-root
```

Or use a tool like **Lerna**:

```bash
npx lerna publish minor
```

## Troubleshooting

### Error: "You do not have permission to publish"

**Cause:** Not logged in or package name taken by someone else

**Solution:**
```bash
# Check login
npm whoami

# Login again
npm login

# Check if package exists
npm view @claudemesh/cli
```

### Error: "403 Forbidden - You cannot publish over the existing version"

**Cause:** Trying to publish same version twice

**Solution:**
```bash
# Bump version
npm version patch

# Publish again
npm publish
```

### Error: "Package files must be .js or .mjs"

**Cause:** TypeScript files not compiled

**Solution:**
```bash
# Build before publishing
npm run build

# Verify dist/ exists
ls dist/
```

### Error: "ENOENT: no such file or directory"

**Cause:** Missing files or incorrect directory

**Solution:**
```bash
# Check you're in package directory
pwd  # Should be packages/cli

# Check package.json
cat package.json

# Build if needed
npm run build
```

### Error: "E401 Unauthorized"

**Cause:** Invalid credentials or 2FA enabled

**Solution:**
```bash
# Login with OTP if using 2FA
npm login --auth-type=legacy

# Enter username, password, and OTP
```

## Publishing Checklist

Use this checklist before each publish:

- [ ] Logged in to npm (`npm whoami`)
- [ ] All packages built (`pnpm build`)
- [ ] Package names available (or you own them)
- [ ] `"private": true` removed from all package.json
- [ ] Version numbers updated
- [ ] README.md added to each package
- [ ] CHANGELOG.md updated
- [ ] Dry run successful (`npm publish --dry-run`)
- [ ] Tested in clean environment

## Next Steps After Publishing

1. **Add badges to README.md**
   ```markdown
   ![npm version](https://badge.fury.io/js/%40claudemesh%2Fcli.svg)
   ![downloads](https://img.shields.io/npm/dm/%40claudemesh%2Fcli.svg)
   ```

2. **Create GitHub release**
   - Go to your repo on GitHub
   - Click "Releases" → "Draft a new release"
   - Tag version: `v1.0.0`
   - Copy CHANGELOG.md content

3. **Announce your package**
   - Share on social media
   - Submit to directories (npm trends, bestofjs, etc.)

## Automated Publishing (Optional)

For easier workflow, set up automated publishing:

### Using GitHub Actions

Create `.github/workflows/publish.yml`:

```yaml
name: Publish

on:
  push:
    tags:
      - 'v*'

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'
      - run: pnpm install
      - run: pnpm build
      - run: npm publish -w packages/cli
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Then just push a tag to publish:

```bash
git tag v1.0.0
git push origin v1.0.0
```

### Using Changesets

For monorepo version management:

```bash
npm install -D @changesets/cli
npx changeset init

# Add changeset
npx changeset

# Version packages
npx changeset version

# Publish
npx changeset publish
```

## Support

If you encounter issues:

1. Check npm documentation: https://docs.npmjs.com/
2. Search existing issues: https://github.com/your-username/claudemesh/issues
3. Create a new issue with error details
