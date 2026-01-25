# ClaudeMesh

Domain-specific subagents and skills for Claude Code, with integrated git workflow automation.

## Quick Start

```bash
# Install CLI globally
npm install -g @claudemesh/cli

# Initialize in your project
cd my-project
ccmesh init

# Add domain packages
ccmesh add git
ccmesh add backend-node

# Or add globally (available in all projects)
ccmesh add git --global

# Start using with Claude Code
claude
```

## Available Domains

### Production Ready
- **@claudemesh/git** - Git workflow automation (4 agents, 2 skills)
  - `commit-expert` - Conventional commits & message generation
  - `code-reviewer` - Pre-commit review with security checks
  - `branch-manager` - Branch naming, merging, conflict resolution
  - `pr-helper` - PR descriptions, checklists, changelog
- **@claudemesh/backend-node** - Node.js/TypeScript backend (4 agents, 4 skills)
  - `api-architect` - REST/GraphQL API design
  - `auth-specialist` - JWT, OAuth, sessions, RBAC, MFA
  - `database-integration` - Prisma, TypeORM, connection pooling
  - `microservices-expert` - Service mesh, event-driven, sagas

### In Development
- **@claudemesh/database-optimization** - SQL optimization
- **@claudemesh/database-athena** - AWS Athena specific
- **@claudemesh/database-redshift** - AWS Redshift specific
- **@claudemesh/database-bigquery** - GCP BigQuery specific
- **@claudemesh/frontend-react** - React/Next.js frontend
- **@claudemesh/python-data** - Python data science and FastAPI

## CLI Commands

```bash
ccmesh init                        # Initialize .claude/ structure
ccmesh add <domain>                # Add domain package locally (e.g., git, backend-node)
ccmesh add <domain> --global       # Add domain package globally (available in all projects)
ccmesh remove <domain>             # Remove local domain
ccmesh remove <domain> --global    # Remove global domain
ccmesh list                        # List installed domains (global + local)
ccmesh available                   # List all available domains to install
ccmesh sync                        # Re-sync domains from node_modules
ccmesh validate                    # Validate all agent/skill files
```

## Global vs Local Installation

### Local Installation (Default)
- Domains are added to `.claude/` in your project directory
- Only available in that specific project
- Great for project-specific domains (e.g., `backend-node`, `frontend-react`)

```bash
ccmesh add backend-node
ccmesh add frontend-react
```

### Global Installation
- Domains are added to `~/.claude/` in your home directory
- Available in ALL projects
- Perfect for universal domains (e.g., `git`)

```bash
ccmesh add git --global
```

### View Installed Domains
The `ccmesh list` command shows both global and local installations:

```bash
ccmesh list
```

Output:
```
🌍 Globally Installed:
  @claudemesh/git (v1.0.0) [global]
    ├── agents (4)
    └── skills (2)

─────────────────────────────────────

📁 Locally Installed:
  @claudemesh/backend-node (v1.0.0)
    ├── agents (4)
    └── skills (4)
```

## Slash Commands (Skills)

ClaudeMesh provides useful slash commands you can use directly in Claude Code:

| Command | Description |
|---------|-------------|
| `/ccmesh-clean` | Clean AI-generated temp files, drafts, and analysis files |
| `/ccmesh-status` | Check project health, git status, and installed domains |
| `/ccmesh-fix` | Auto-fix linting, formatting, and common code issues |
| `/ccmesh-docs` | Generate or update project documentation |
| `/ccmesh-optimize` | Analyze code for performance and suggest optimizations |
| `/review-code` | Comprehensive code review with security checks |
| `/securify` | Security analysis and hardening guide |

### Usage Examples

```bash
# In Claude Code, use slash commands:
> /ccmesh-clean           # Clean up temp files
> /ccmesh-status          # Check project health
> /ccmesh-fix             # Auto-fix issues
> /ccmesh-docs            # Generate documentation
> /ccmesh-optimize        # Performance analysis
```

## Usage with Agents

Once installed, Claude Code will automatically use the appropriate agents:

```bash
# In your project with Claude Code
claude

# Then try these prompts:
> "Help me create a commit message for my changes"
> "Design a REST API for user management"
> "How do I implement JWT authentication?"
> "Review my code for security issues"
```

## Development

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm

### Setup

```bash
# Clone the repository
git clone <your-repo-url>
cd claudemesh

# Install dependencies
pnpm install

# Build all packages
pnpm build

# Link CLI locally for testing
cd packages/cli
npm link
```

### Local Testing

```bash
# Create a test project
mkdir ~/test-claudemesh
cd ~/test-claudemesh

# Initialize with local CLI
ccmesh init

# Add domain packages
ccmesh add git
ccmesh add backend-node

# Verify installation
ccmesh list
ccmesh validate

# Test with Claude Code
claude --agent commit-expert -p "Help me write a commit message"
```

### Project Structure

```
claudemesh/
├── packages/
│   ├── cli/                    # CLI tool (@claudemesh/cli)
│   ├── git/                    # Git workflow (@claudemesh/git)
│   ├── backend-node/           # Backend development (@claudemesh/backend-node)
│   ├── database-optimization/  # Database optimization
│   └── ...
├── .claude/                    # Claude Code configuration
├── package.json                # Root package with build scripts
├── pnpm-workspace.yaml         # Workspace configuration
└── README.md
```

### Package Development

Each domain package has this structure:

```
packages/<domain>/
├── src/
│   ├── agents/          # Agent definitions (.md files)
│   └── skills/          # Skill definitions (directories with SKILL.md)
├── package.json
└── README.md
```

### Building

```bash
# Build all packages
pnpm build

# Build specific package
cd packages/cli
npm run build

# Watch mode for development
pnpm dev
```

## Publishing to npm

### Prerequisites

1. **Create an npm account** at https://www.npmjs.com/signup

2. **Login to npm**
   ```bash
   npm login
   ```

3. **Verify package names are available**
   ```bash
   npm view @claudemesh/cli
   npm view @claudemesh/git
   # Should return "404 Not Found" if available
   ```

### Pre-Publishing Checklist

Before publishing, ensure each package has:

- [ ] Version number (1.0.0 for first release)
- [ ] Description
- [ ] Author (your name)
- [ ] License
- [ ] Keywords
- [ ] README.md with usage instructions
- [ ] NO `"private": true` in package.json
- [ ] Files are built (`dist/` directory exists)
- [ ] `.npmignore` file (optional)

### Publishing Steps

1. **Build all packages**
   ```bash
   pnpm install
   pnpm build
   ```

2. **Publish each package** (order matters!)
   ```bash
   # Publish CLI first
   cd packages/cli
   npm publish

   # Publish domain packages
   cd ../git
   npm publish

   cd ../backend-node
   npm publish

   # ... repeat for other packages
   ```

3. **Verify published packages**
   ```bash
   npm view @claudemesh/cli
   npm view @claudemesh/git
   ```

4. **Test installation**
   ```bash
   cd ~/test-claudemesh
   npm install -g @claudemesh/cli
   ccmesh init
   ccmesh add git
   ```

### Version Management

For subsequent releases:

1. Update version numbers in all `package.json` files
2. Update CHANGELOG.md
3. Run `pnpm build`
4. Publish updated packages

### Automated Publishing (Optional)

For easier monorepo management, consider using:

- **Lerna**: `npm install -g lerna`
- **Changesets**: `npm install -g @changesets/cli`

## License

MIT
