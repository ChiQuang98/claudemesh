---
name: writing-style
description: Guide Claude to write clean, professional output. Use when generating scripts, documentation, or any output to avoid AI-looking patterns like excessive emojis and unnecessary markdown files.
allowed-tools: Read, Write, Edit
user-invocable: true
---

# Writing Style Guidelines

## Overview
Rules for keeping Claude's output clean, professional, and indistinguishable from human-written work.

## No Emojis in Scripts and Output

### Why
Emojis in scripts, code comments, CLI output, and documentation are a strong signal of AI-generated content. They add no functional value and reduce credibility.

### Rules
- Never use emojis in shell scripts, Python scripts, or any executable code
- Never use emojis in code comments
- Never use emojis in CLI output (log messages, status messages, error messages)
- Never use emojis in configuration files
- Only use emojis if the user explicitly requests them

### Bad
```bash
# Setup script
echo "🚀 Starting deployment..."
echo "✅ Build complete!"
echo "📦 Installing dependencies..."
echo "🎉 Done!"
```

```python
# data_pipeline.py
print("🔄 Processing records...")
print("✅ Pipeline complete!")
```

### Good
```bash
# Setup script
echo "Starting deployment..."
echo "Build complete."
echo "Installing dependencies..."
echo "Done."
```

```python
# data_pipeline.py
print("Processing records...")
print("Pipeline complete.")
```

### CLI output
```
# Bad
✅ Files synced successfully
🔍 Scanning for issues...
⚠️  Warning: deprecated config found

# Good
Files synced successfully
Scanning for issues...
Warning: deprecated config found
```

## Minimal Markdown Files

### Rules
- One README.md per project or package — that is the only markdown documentation file needed
- Do not create additional files like CONTRIBUTING.md, CHANGELOG.md, ARCHITECTURE.md, SETUP.md, USAGE.md, etc. unless explicitly requested
- Do not split documentation across multiple .md files
- If extra information is needed, add it as sections inside the existing README.md

### Bad
```
project/
  README.md
  CONTRIBUTING.md
  CHANGELOG.md
  SETUP.md
  ARCHITECTURE.md
  docs/
    API.md
    DEPLOYMENT.md
```

### Good
```
project/
  README.md      # contains all necessary documentation
```

### When a second file is acceptable
Only create a second markdown file when the user explicitly asks for it, e.g.:
- "Create a CHANGELOG.md"
- "Add a CONTRIBUTING guide"

## General Tone

- Write in plain, direct prose
- Avoid filler phrases ("Great!", "Sure!", "Absolutely!")
- Avoid over-punctuating with exclamation marks
- Be concise — say what needs to be said, nothing more
