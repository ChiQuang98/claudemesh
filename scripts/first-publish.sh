#!/bin/bash

# This script publishes the first package to create the @claudemesh scope
# Run this once before using the main publish.sh script

set -e

echo "=========================================="
echo "  First-Time Setup: Create @claudemesh Scope"
echo "=========================================="
echo ""

# Check npm login
if ! npm whoami &> /dev/null; then
    echo "❌ Not logged in to npm"
    echo "Please run: npm login"
    exit 1
fi

echo "✓ Logged in as: $(npm whoami)"
echo ""

# Build first
echo "Building packages..."
pnpm install
pnpm build

echo ""
echo "Publishing first package to create @claudemesh scope..."
echo ""

# Try publishing cli package first (smallest, simplest)
cd packages/cli

echo "Publishing @claudemesh/cli..."
if npm publish --access public; then
    echo ""
    echo "✓ Successfully published @claudemesh/cli"
    echo ""
    echo "The @claudemesh scope has been created!"
    echo ""
    echo "You can now use the main publish script:"
    echo "  ./scripts/publish.sh"
    echo ""
else
    echo ""
    echo "❌ Failed to publish"
    echo ""
    echo "If you see 'Scope not found', you need to:"
    echo "1. Visit https://www.npmjs.com/org/create"
    echo "2. Create organization named 'claudemesh'"
    echo "3. Run this script again"
    echo ""
fi
