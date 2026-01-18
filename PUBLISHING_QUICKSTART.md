# Quick Start: Publishing ClaudeMesh to npm

## Pre-Publishing Checklist

- [ ] npm account created (https://www.npmjs.com/signup)
- [ ] Logged in to npm (`npm login`)
- [ ] Updated author name in package.json files
- [ ] Updated repository URLs in package.json files
- [ ] All packages built (`pnpm build`)

## Quick Publishing Steps

```bash
# 1. Navigate to project
cd /Users/chiquang/Documents/project/claudemesh

# 2. Login to npm (if not already)
npm login

# 3. Build all packages
pnpm install
pnpm build

# 4. Publish CLI first
cd packages/cli
npm publish

# 5. Publish git package
cd ../git
npm publish

# 6. Publish backend-node package
cd ../backend-node
npm publish

# 7. Publish database-optimization package (if ready)
cd ../database-optimization
npm publish
```

## Verify Publishing

```bash
# Check packages are on npm
npm view @claudemesh/cli
npm view @claudemesh/git
npm view @claudemesh/backend-node

# Or visit in browser:
# https://www.npmjs.com/package/@claudemesh/cli
```

## Test Installation

```bash
# Create test project
mkdir ~/test-claudemesh-install
cd ~/test-claudemesh-install

# Install globally
npm install -g @claudemesh/cli

# Test
claudemesh init
claudemesh add git
claudemesh list

# Clean up
cd ~
rm -rf test-claudemesh-install
```

## What to Update Before Publishing

### 1. Author Name
Edit each `packages/*/package.json`:
```json
"author": "Your Name <your.email@example.com>"
```

### 2. Repository URL
Edit each `packages/*/package.json`:
```json
"repository": {
  "type": "git",
  "url": "https://github.com/your-username/claudemesh.git"
}
```

### 3. README Files
Add README.md to each package directory:
- `packages/cli/README.md`
- `packages/git/README.md`
- `packages/backend-node/README.md`
- `packages/database-optimization/README.md`

## Common Issues & Solutions

| Error | Solution |
|-------|----------|
| `403 Forbidden` | Version already exists - bump version number |
| `401 Unauthorized` | Run `npm login` again |
| `package name in use` | Choose a different package name |
| `files must be .js` | Run `pnpm build` first |

## Next Steps After Publishing

1. Add badges to main README.md
2. Create GitHub release
3. Announce on social media

For detailed instructions, see [PUBLISHING.md](./PUBLISHING.md)
