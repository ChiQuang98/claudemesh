# Publishing Guide

This guide explains how to use the automated publishing script for ClaudeMesh packages.

## Quick Start

```bash
# Make sure you're logged in to npm
npm login

# Publish all packages (automatically bumps patch version)
./scripts/publish.sh
```

## Common Scenarios

### 1. Initial Publish (First Time)

```bash
# All packages start at v1.0.0, just run:
./scripts/publish.sh
```

### 2. Update After Making Changes

```bash
# After editing any package, run:
./scripts/publish.sh

# The script will:
# - Detect which packages have changes
# - Automatically bump the version (patch by default)
# - Build and publish only changed packages
```

### 3. Release a Minor Version (New Features)

```bash
# Bumps minor version (e.g., 1.0.0 → 1.1.0)
./scripts/publish.sh -i minor
```

### 4. Release a Major Version (Breaking Changes)

```bash
# Bumps major version (e.g., 1.0.0 → 2.0.0)
./scripts/publish.sh -i major
```

### 5. Set Specific Version

```bash
# Set exact version (e.g., 1.2.3)
./scripts/publish.sh -v 1.2.3
```

### 6. Dry Run (Preview What Will Be Published)

```bash
# Shows what would be published without actually doing it
./scripts/publish.sh -d

# Combine with version bump to preview:
./scripts/publish.sh -d -i minor
```

### 7. Skip Build Step

```bash
# If you've already built and just want to publish
./scripts/publish.sh --skip-build
```

## Command Options

| Option | Short | Description | Example |
|--------|-------|-------------|---------|
| `--dry-run` | `-d` | Simulate publishing without making changes | `./scripts/publish.sh -d` |
| `--increment <type>` | `-i` | Version bump: major, minor, patch | `./scripts/publish.sh -i minor` |
| `--version <version>` | `-v` | Set exact version | `./scripts/publish.sh -v 2.0.0` |
| `--skip-build` | `-s` | Skip the build step | `./scripts/publish.sh -s` |
| `--help` | `-h` | Show help message | `./scripts/publish.sh -h` |

## What the Script Does

1. **Checks authentication** - Verifies you're logged in to npm
2. **Detects changes** - Checks which packages have uncommitted changes
3. **Bumps versions** - Automatically increments version numbers
4. **Builds packages** - Compiles TypeScript (if needed)
5. **Publishes to npm** - Publishes in correct dependency order
6. **Provides summary** - Shows what was published, what was skipped

## Change Detection

The script considers a package as "having changes" if:

- It has never been published to npm
- There are uncommitted changes in git
- There are untracked files in the package directory
- The version in package.json differs from what's on npm

If no changes are detected, the package is **skipped** (unless you force with `-i` or `-v`).

## Publish Order

Packages are published in this order (to handle dependencies correctly):

1. `cli` - The CLI tool
2. `git` - Git workflows
3. `backend-node` - Node.js backend
4. `database-optimization` - DB optimization
5. `database-athena` - AWS Athena
6. `frontend-react` - React frontend

## Example Workflow

```bash
# 1. Make changes to some packages
# Edit files in packages/git and packages/backend-node

# 2. Preview what will be published
./scripts/publish.sh -d

# 3. Actually publish (bumps patch version automatically)
./scripts/publish.sh

# 4. Review the version bumps
git diff

# 5. Commit the changes
git add package.json packages/*/package.json
git commit -m "chore: release v1.0.1"

# 6. Push to GitHub
git push

# 7. (Optional) Create GitHub release with changelog
```

## Troubleshooting

### "Not logged in to npm"

```bash
npm login
```

### "Build failed for package"

Check the error messages and fix any TypeScript errors:

```bash
cd packages/<failed-package>
npm run build
# Fix errors...
cd ../..
./scripts/publish.sh
```

### "Dry-run failed for package"

The package has validation errors. Check the detailed error:

```bash
cd packages/<failed-package>
npm publish --dry-run
# Fix errors...
```

### Package was skipped but you want to publish

Force a version bump:

```bash
./scripts/publish.sh -i patch
```

Or set a specific version:

```bash
./scripts/publish.sh -v 1.0.5
```

## Best Practices

1. **Always use dry-run first** - Preview what will happen
   ```bash
   ./scripts/publish.sh -d
   ```

2. **Commit after publishing** - The script modifies package.json files
   ```bash
   git add packages/*/package.json
   git commit -m "chore: bump versions"
   ```

3. **Use semantic versioning**:
   - **patch** (1.0.0 → 1.0.1): Bug fixes, small changes
   - **minor** (1.0.0 → 1.1.0): New features, backward compatible
   - **major** (1.0.0 → 2.0.0): Breaking changes

4. **Test after publishing**:
   ```bash
   cd /tmp/test-claudemesh
   npm install -g @claudemesh/cli
   claudemesh init
   ```

5. **Keep CHANGELOG.md** - Document what changed in each version

## Verification

After publishing, verify on npm:

```bash
# Check specific package
npm view @claudemesh/cli
npm view @claudemesh/git

# Or visit
# https://www.npmjs.com/package/@claudemesh/cli
# https://www.npmjs.com/package/@claudemesh/git
```
