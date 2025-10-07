#!/bin/bash
# Release script for EPSM
# Usage: ./scripts/release.sh [major|minor|patch] [release-message]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Function to display usage
usage() {
    echo "Usage: $0 [major|minor|patch] [release-message]"
    echo ""
    echo "Arguments:"
    echo "  major          Bump major version (X.0.0)"
    echo "  minor          Bump minor version (0.X.0)"
    echo "  patch          Bump patch version (0.0.X)"
    echo "  release-message Optional release message (default: 'Release version X.Y.Z')"
    echo ""
    echo "Examples:"
    echo "  $0 patch"
    echo "  $0 minor 'Add new simulation features'"
    echo "  $0 major 'Breaking changes to API'"
    exit 1
}

# Check if arguments are provided
if [ $# -lt 1 ]; then
    print_error "Missing version bump type"
    usage
fi

BUMP_TYPE=$1
RELEASE_MESSAGE=${2:-""}

# Validate bump type
if [[ ! "$BUMP_TYPE" =~ ^(major|minor|patch)$ ]]; then
    print_error "Invalid bump type: $BUMP_TYPE"
    usage
fi

# Get the project root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VERSION_FILE="$PROJECT_ROOT/VERSION"
CHANGELOG_FILE="$PROJECT_ROOT/CHANGELOG.md"
PACKAGE_JSON="$PROJECT_ROOT/frontend/package.json"

print_info "EPSM Release Script"
echo ""

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    print_error "Not in a git repository"
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    print_warning "You have uncommitted changes"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Release cancelled"
        exit 0
    fi
fi

# Get current version
if [ ! -f "$VERSION_FILE" ]; then
    print_error "VERSION file not found at $VERSION_FILE"
    exit 1
fi

CURRENT_VERSION=$(cat "$VERSION_FILE")
print_info "Current version: $CURRENT_VERSION"

# Parse current version
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Bump version based on type
case "$BUMP_TYPE" in
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    patch)
        PATCH=$((PATCH + 1))
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"
print_info "New version: $NEW_VERSION"

# Set release message
if [ -z "$RELEASE_MESSAGE" ]; then
    RELEASE_MESSAGE="Release version $NEW_VERSION"
fi

print_info "Release message: $RELEASE_MESSAGE"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with this release? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Release cancelled"
    exit 0
fi

echo ""
print_info "Starting release process..."
echo ""

# Update VERSION file
print_info "Updating VERSION file..."
echo "$NEW_VERSION" > "$VERSION_FILE"
print_success "VERSION file updated to $NEW_VERSION"

# Update package.json
print_info "Updating package.json..."
if [ -f "$PACKAGE_JSON" ]; then
    # Use sed to update version in package.json (works on both macOS and Linux)
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    else
        # Linux
        sed -i "s/\"version\": \".*\"/\"version\": \"$NEW_VERSION\"/" "$PACKAGE_JSON"
    fi
    print_success "package.json updated to $NEW_VERSION"
else
    print_warning "package.json not found at $PACKAGE_JSON"
fi

# Update CHANGELOG.md
print_info "Updating CHANGELOG.md..."
if [ -f "$CHANGELOG_FILE" ]; then
    # Get current date
    RELEASE_DATE=$(date +%Y-%m-%d)
    
    # Create temporary file with new version entry
    TEMP_FILE=$(mktemp)
    
    # Read CHANGELOG and insert new version section after [Unreleased]
    awk -v version="$NEW_VERSION" -v date="$RELEASE_DATE" -v msg="$RELEASE_MESSAGE" '
    /## \[Unreleased\]/ {
        print
        print ""
        print "### Planned"
        print "- Features and improvements planned for next release"
        print ""
        print "---"
        print ""
        print "## [" version "] - " date
        print ""
        print "### " msg
        print ""
        next
    }
    { print }
    ' "$CHANGELOG_FILE" > "$TEMP_FILE"
    
    mv "$TEMP_FILE" "$CHANGELOG_FILE"
    print_success "CHANGELOG.md updated with version $NEW_VERSION"
else
    print_warning "CHANGELOG.md not found at $CHANGELOG_FILE"
fi

# Commit changes
print_info "Committing changes..."
git add "$VERSION_FILE" "$PACKAGE_JSON" "$CHANGELOG_FILE"
git commit -m "chore: bump version to $NEW_VERSION"
print_success "Changes committed"

# Create git tag
print_info "Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "$RELEASE_MESSAGE"
print_success "Git tag v$NEW_VERSION created"

echo ""
print_success "Release preparation complete!"
echo ""
print_info "Next steps:"
echo "  1. Review the changes: git log -1 --stat"
echo "  2. Push the changes: git push origin $(git branch --show-current)"
echo "  3. Push the tag: git push origin v$NEW_VERSION"
echo ""
print_info "After pushing the tag, GitHub Actions will:"
echo "  - Create a GitHub release with changelog notes"
echo "  - Build and push Docker images with version tags"
echo ""
print_warning "If you need to undo this release:"
echo "  git tag -d v$NEW_VERSION"
echo "  git reset --hard HEAD~1"
