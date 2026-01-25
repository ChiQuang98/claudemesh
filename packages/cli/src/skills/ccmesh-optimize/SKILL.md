---
name: ccmesh-optimize
description: Analyze and optimize code for performance, bundle size, and best practices. Suggests improvements.
allowed-tools: Bash, Read, Glob, Grep
user-invocable: true
---

# ClaudeMesh Code Optimizer

When this skill is invoked, analyze the codebase and suggest optimizations.

## Step 1: Project Analysis

```bash
# Identify project type
ls package.json requirements.txt go.mod Cargo.toml 2>/dev/null

# Check bundle/build size if applicable
ls -la dist/ build/ .next/ 2>/dev/null

# Count lines of code
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" -o -name "*.jsx" \) -not -path "./node_modules/*" | xargs wc -l 2>/dev/null | tail -1
```

## Step 2: Dependency Analysis

### Check for unused dependencies

```bash
# For Node.js projects
npx depcheck 2>/dev/null || echo "depcheck not available"
```

### Check for outdated dependencies

```bash
npm outdated 2>/dev/null || pnpm outdated 2>/dev/null
```

### Check for duplicate dependencies

```bash
npm ls --all 2>/dev/null | grep -E "deduped|invalid" | head -20
```

## Step 3: Code Quality Checks

### Find large files (potential code splitting candidates)

```bash
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.tsx" \) -not -path "./node_modules/*" -size +50k 2>/dev/null
```

### Find complex functions (high cyclomatic complexity indicators)

```bash
# Files with many if/else/switch statements
grep -rc "if\|else\|switch\|case" --include="*.ts" --include="*.js" . 2>/dev/null | sort -t: -k2 -nr | head -10
```

### Find potential memory leaks

```bash
# Event listeners without cleanup
grep -rn "addEventListener\|on(" --include="*.ts" --include="*.tsx" . 2>/dev/null | head -20
```

## Step 4: Performance Patterns to Check

### React/Next.js
- [ ] Unnecessary re-renders (missing useMemo/useCallback)
- [ ] Large component files that should be split
- [ ] Missing dynamic imports for code splitting
- [ ] Images without next/image optimization
- [ ] Missing Suspense boundaries

### Node.js Backend
- [ ] Synchronous file operations (use async)
- [ ] Missing connection pooling
- [ ] N+1 query problems
- [ ] Missing caching
- [ ] Blocking operations in request handlers

### General
- [ ] Unused exports
- [ ] Dead code
- [ ] Duplicate code blocks
- [ ] Overly complex functions

## Step 5: Bundle Size Analysis

For frontend projects:

```bash
# Check if bundle analyzer is available
npm run build --if-present 2>/dev/null
npx source-map-explorer dist/**/*.js 2>/dev/null || echo "Run: npm install -D source-map-explorer"
```

## Step 6: Generate Optimization Report

```markdown
# Optimization Report

## Summary
- Total files analyzed: X
- Potential issues found: Y
- Estimated improvement: Z%

## High Priority
1. **Issue**: Description
   **Impact**: High/Medium/Low
   **Fix**: How to fix

## Medium Priority
...

## Low Priority
...

## Recommended Actions
1. Action 1
2. Action 2
3. Action 3
```

## Quick Wins

These optimizations typically provide immediate benefits:

1. **Remove unused dependencies** - Reduces install time and bundle size
2. **Enable tree shaking** - Remove dead code from bundles
3. **Add dynamic imports** - Split code for faster initial load
4. **Optimize images** - Use WebP, lazy loading
5. **Enable caching** - Add proper cache headers
6. **Minify production builds** - Reduce file sizes

## Options

- `--deps` - Only analyze dependencies
- `--perf` - Only check performance patterns
- `--bundle` - Only analyze bundle size
- `--full` - Complete optimization analysis
