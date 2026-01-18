# @claudemesh/git

Git workflow automation for Claude Code.

## Agents

- **commit-expert** - Smart commit message generation following conventional commits
- **code-reviewer** - Pre-commit code review for quality and security
- **branch-manager** - Branch naming, merging, and conflict resolution
- **pr-helper** - Pull request descriptions and review checklists

## Skills

- **git-conventions** - Git best practices and commit message guidelines
- **conflict-resolution** - Merge conflict resolution strategies

## Installation

```bash
claudemesh add git
```

## Usage

Once installed, Claude Code will automatically use these agents when appropriate:

- "Help me create a commit message" → Uses commit-expert
- "Review my staged changes" → Uses code-reviewer
- "Suggest a branch name" → Uses branch-manager
- "Generate a PR description" → Uses pr-helper
