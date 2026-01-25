---
name: ccmesh-docs
description: Generate or update documentation for the current project. Creates README, API docs, and usage examples.
allowed-tools: Bash, Read, Write, Edit, Glob, Grep
user-invocable: true
---

# ClaudeMesh Documentation Generator

When this skill is invoked, analyze the project and generate/update documentation.

## Step 1: Analyze Project Structure

```bash
# Get project overview
find . -type f \( -name "*.ts" -o -name "*.js" -o -name "*.py" -o -name "*.go" \) | head -50

# Check for existing docs
ls -la README.md CHANGELOG.md docs/ 2>/dev/null
```

## Step 2: Identify Documentation Needs

Check what documentation exists and what's missing:

1. **README.md** - Project overview, installation, usage
2. **API documentation** - Function/class documentation
3. **Configuration** - Environment variables, settings
4. **Examples** - Usage examples and tutorials

## Step 3: Generate Documentation

### README.md Template

```markdown
# Project Name

Brief description of what this project does.

## Installation

```bash
npm install project-name
# or
pnpm add project-name
```

## Quick Start

```typescript
import { something } from 'project-name';

// Basic usage example
```

## Features

- Feature 1
- Feature 2
- Feature 3

## Configuration

| Variable | Description | Default |
|----------|-------------|---------|
| `VAR_1` | Description | `value` |

## API Reference

### `functionName(params)`

Description of the function.

**Parameters:**
- `param1` (type) - Description

**Returns:** type - Description

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT
```

## Step 4: Extract API Documentation

For TypeScript/JavaScript projects, extract:
- Exported functions and their JSDoc comments
- Type definitions
- Class methods and properties

For Python projects, extract:
- Functions and docstrings
- Class definitions
- Module-level documentation

## Step 5: Update Existing Documentation

If documentation exists:
1. Check if it's outdated
2. Add missing sections
3. Update code examples to match current API
4. Fix broken links

## Output

After generating documentation:
- Show what was created/updated
- List any manual review needed
- Suggest additional documentation

## Options

- `--readme` - Only generate/update README.md
- `--api` - Only generate API documentation
- `--full` - Generate complete documentation suite
