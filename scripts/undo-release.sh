#!/bin/bash
# Script to undo release from development and redo from main

set -e

echo "🔄 Undoing release from development branch..."

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "development" ]; then
    echo "❌ Error: Must be on development branch"
    exit 1
fi

# Get the latest tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LATEST_TAG" ]; then
    echo "❌ No tag found to undo"
    exit 1
fi

echo "📍 Latest tag: $LATEST_TAG"
echo "🗑️  Deleting tag..."
git tag -d "$LATEST_TAG"

echo "⏮️  Reverting last commit..."
git reset --hard HEAD~1

echo "✅ Release undone from development"
echo ""
echo "📋 Next steps:"
echo "1. Switch to main: git checkout main"
echo "2. Merge development: git merge development"
echo "3. Create release: ./scripts/release.sh patch"
echo "4. Push: git push origin main && git push origin v<VERSION>"
echo "5. Merge back: git checkout development && git merge main"
