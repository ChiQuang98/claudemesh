#!/bin/bash

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PUBLISH_ORDER=("cli" "git" "backend-node" "database-optimization" "database-athena" "frontend-react")
SCOPE="@claudemesh"
ROOT_DIR="$(pwd)"

# Parse arguments
DRY_RUN=false
INCREMENT="patch"  # major, minor, patch, or specific version
SPECIFIC_VERSION=""
SKIP_BUILD=false

print_usage() {
  echo "Usage: ./scripts/publish.sh [options]"
  echo ""
  echo "Options:"
  echo "  -d, --dry-run        Simulate publishing without actually doing it"
  echo "  -i, --increment <type>  Version increment type: major, minor, patch (default: patch)"
  echo "  -v, --version <version>  Specify exact version (e.g., 1.2.3)"
  echo "  -s, --skip-build     Skip the build step"
  echo "  -h, --help           Show this help message"
  echo ""
  echo "Examples:"
  echo "  ./scripts/publish.sh                    # Publish all with patch bump"
  echo "  ./scripts/publish.sh -i minor           # Bump minor version"
  echo "  ./scripts/publish.sh -v 2.0.0           # Set specific version"
  echo "  ./scripts/publish.sh -d                 # Dry run to check what would publish"
  echo "  ./scripts/publish.sh --skip-build       # Skip build (if already built)"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -i|--increment)
      INCREMENT="$2"
      shift 2
      ;;
    -v|--version)
      SPECIFIC_VERSION="$2"
      shift 2
      ;;
    -s|--skip-build)
      SKIP_BUILD=true
      shift
      ;;
    -h|--help)
      print_usage
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      print_usage
      exit 1
      ;;
  esac
done

print_header() {
  echo -e "\n${BLUE}========================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}========================================${NC}\n"
}

print_step() {
  echo -e "${GREEN}➜${NC} $1"
}

print_info() {
  echo -e "${YELLOW}ℹ${NC} $1"
}

print_warning() {
  echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
  echo -e "${RED}✗${NC} $1"
}

# Check if npm is logged in
check_npm_auth() {
  print_step "Checking npm authentication..."
  if ! npm whoami &> /dev/null; then
    print_error "Not logged in to npm. Please run 'npm login' first."
    exit 1
  fi
  print_info "Authenticated as: $(npm whoami)"
}

# Check if in project root
check_project_root() {
  if [ ! -f "package.json" ] || [ ! -d "packages" ]; then
    print_error "Not in project root directory"
    print_info "Please run this script from the claudemesh root directory"
    exit 1
  fi
}

# Get current version from package.json
get_current_version() {
  node -e "const fs=require('fs'); console.log(JSON.parse(fs.readFileSync('$1/package.json', 'utf8')).version)"
}

# Get published version from npm
get_published_version() {
  local package_name="$1"
  if npm view "$package_name" version &> /dev/null; then
    npm view "$package_name" version
  else
    echo "not-published"
  fi
}

# Calculate new version
calculate_new_version() {
  local current_version="$1"
  local increment="$2"
  local specific="$3"

  if [[ -n "$specific" ]]; then
    echo "$specific"
    return
  fi

  IFS='.' read -r major minor patch <<< "$current_version"

  case "$increment" in
    major)
      echo "$((major + 1)).0.0"
      ;;
    minor)
      echo "${major}.$((minor + 1)).0"
      ;;
    patch)
      echo "${major}.${minor}.$((patch + 1))"
      ;;
    *)
      print_error "Invalid increment type: $increment"
      exit 1
      ;;
  esac
}

# Check if package has changes since last publish
has_changes() {
  local pkg="$1"
  local current_version="$2"
  local published_version="$3"

  # If never published, it has changes
  if [[ "$published_version" == "not-published" ]]; then
    return 0
  fi

  # Check git status for changes since last publish
  if git rev-parse --git-dir > /dev/null 2>&1; then
    local pkg_dir="packages/$pkg"
    # Check if there are any uncommitted changes
    if ! git diff --quiet "$pkg_dir" 2>/dev/null; then
      return 0  # Has uncommitted changes
    fi

    # Check if there are untracked files
    if git ls-files --others --exclude-standard "$pkg_dir" | grep -q .; then
      return 0  # Has untracked files
    fi

    # If versions differ, consider it as needing update
    if [[ "$current_version" != "$published_version" ]]; then
      return 0  # Version manually changed
    fi

    # No changes detected
    return 1
  fi

  # If no git, assume it has changes
  return 0
}

# Update version in package.json
update_version() {
  local pkg_dir="$1"
  local new_version="$2"

  if [[ "$DRY_RUN" == true ]]; then
    print_info "[DRY RUN] Would update $pkg_dir/package.json to version $new_version"
    return
  fi

  # Use npm version to update properly
  cd "$pkg_dir"
  npm version "$new_version" --no-git-tag-version > /dev/null
  cd "$ROOT_DIR"
}

# Publish a single package
publish_package() {
  local pkg="$1"
  local pkg_dir="$ROOT_DIR/packages/$pkg"
  local package_name="$SCOPE/$pkg"

  print_step "Processing $package_name..."

  # Check if package.json exists
  if [[ ! -f "$pkg_dir/package.json" ]]; then
    print_error "package.json not found in $pkg_dir"
    return 1
  fi

  local current_version=$(get_current_version "$pkg_dir")
  local published_version=$(get_published_version "$package_name")

  print_info "Current version: $current_version"
  print_info "Published version: $published_version"

  # Check if there are changes
  if ! has_changes "$pkg" "$current_version" "$published_version"; then
    print_warning "No changes detected in $pkg (use -i or -v to force update). Skipping..."
    return 0
  fi

  # Calculate new version
  local new_version=$(calculate_new_version "$current_version" "$INCREMENT" "$SPECIFIC_VERSION")
  print_info "New version will be: $new_version"

  # Update version in package.json
  update_version "$pkg_dir" "$new_version"

  # Build if needed
  if [[ "$SKIP_BUILD" == false && -f "$pkg_dir/tsconfig.json" ]]; then
    print_step "Building $pkg..."
    cd "$pkg_dir"
    if [[ "$DRY_RUN" == true ]]; then
      print_info "[DRY RUN] Would run: npm run build"
    else
      if ! npm run build; then
        print_error "Build failed for $pkg"
        cd "$ROOT_DIR"
        return 1
      fi
    fi
    cd "$ROOT_DIR"
  fi

  # Publish
  print_step "Publishing $package_name@$new_version..."
  cd "$pkg_dir"

  if [[ "$DRY_RUN" == true ]]; then
    print_info "[DRY RUN] Would run: npm publish --access public"
    echo ""
  else
    # Dry run first to validate
    if ! npm publish --dry-run --access public > /dev/null 2>&1; then
      print_error "Dry-run failed for $package_name"
      print_info "Run 'npm publish --dry-run' in $pkg_dir to see errors"
      cd "$ROOT_DIR"
      return 1
    fi

    # Actually publish
    if npm publish --access public; then
      echo -e "${GREEN}✓${NC} Successfully published $package_name@$new_version\n"
    else
      echo -e "${RED}✗${NC} Failed to publish $package_name\n"
      cd "$ROOT_DIR"
      return 1
    fi
  fi

  cd "$ROOT_DIR"
  return 0
}

# Main execution
main() {
  print_header "ClaudeMesh Publishing Script"

  if [[ "$DRY_RUN" == true ]]; then
    print_warning "DRY RUN MODE - No actual changes will be made"
  fi

  print_info "Configuration:"
  print_info "  Version increment: $INCREMENT"
  if [[ -n "$SPECIFIC_VERSION" ]]; then
    print_info "  Specific version: $SPECIFIC_VERSION"
  fi
  print_info "  Skip build: $SKIP_BUILD"
  print_info "  Packages: ${PUBLISH_ORDER[*]}"
  echo ""

  # Check project root
  check_project_root

  # Check npm authentication
  check_npm_auth

  # Build all packages (if not skipped)
  if [[ "$SKIP_BUILD" == false ]]; then
    print_step "Building all packages..."
    cd "$ROOT_DIR"
    if [[ "$DRY_RUN" == true ]]; then
      print_info "[DRY RUN] Would run: pnpm install && pnpm build"
    else
      if command -v pnpm &> /dev/null; then
        pnpm install
        pnpm build
      elif command -v npm &> /dev/null; then
        npm install
        npm run build
      else
        print_error "Neither pnpm nor npm found"
        exit 1
      fi
    fi
    echo ""
  fi

  # Publish packages in order
  print_header "Publishing Packages"

  failed_packages=()
  published_packages=()
  skipped_packages=()

  for pkg in "${PUBLISH_ORDER[@]}"; do
    # Check if package directory exists
    if [[ ! -d "packages/$pkg" ]]; then
      print_warning "Package directory 'packages/$pkg' not found, skipping..."
      skipped_packages+=("$pkg")
      continue
    fi

    if publish_package "$pkg"; then
      # Check if it was actually published or skipped
      local pkg_dir="packages/$pkg"
      local current_version=$(get_current_version "$pkg_dir")
      local package_name="$SCOPE/$pkg"
      local published_version=$(get_published_version "$package_name")

      if [[ "$current_version" != "$published_version" ]] || [[ "$published_version" == "not-published" ]]; then
        if [[ "$DRY_RUN" == false ]]; then
          published_packages+=("$package_name@$current_version")
        fi
      else
        skipped_packages+=("$pkg")
      fi
    else
      failed_packages+=("$pkg")
    fi
  done

  # Summary
  print_header "Publishing Summary"

  if [[ ${#failed_packages[@]} -gt 0 ]]; then
    print_error "Failed to publish the following packages:"
    for pkg in "${failed_packages[@]}"; do
      echo "  - $pkg"
    done
    echo ""
  fi

  if [[ ${#published_packages[@]} -gt 0 ]]; then
    echo -e "${GREEN}✓ Successfully published:${NC}"
    for pkg in "${published_packages[@]}"; do
      echo "  - $pkg"
    done
    echo ""
  fi

  if [[ ${#skipped_packages[@]} -gt 0 ]]; then
    print_info "Skipped (no changes or not found):"
    for pkg in "${skipped_packages[@]}"; do
      echo "  - $pkg"
    done
    echo ""
  fi

  if [[ ${#failed_packages[@]} -gt 0 ]]; then
    exit 1
  fi

  # Show all published versions
  print_info "Current package versions:"
  for pkg in "${PUBLISH_ORDER[@]}"; do
    if [[ -d "packages/$pkg" ]]; then
      local pkg_dir="packages/$pkg"
      local current_version=$(get_current_version "$pkg_dir")
      local package_name="$SCOPE/$pkg"
      echo "  - $package_name: $current_version"
    fi
  done
  echo ""

  # Git commit suggestion
  if [[ "$DRY_RUN" == false && ${#published_packages[@]} -gt 0 ]]; then
    print_info "Next steps:"
    echo "  1. Review the changes:"
    echo "     git diff"
    echo ""
    echo "  2. Commit the version bumps:"
    echo "     git add package.json packages/*/package.json"
    echo "     git commit -m \"chore: release v$(get_current_version 'packages/cli')\""
    echo ""
    echo "  3. Push to GitHub:"
    echo "     git push"
    echo ""
    echo "  4. Create GitHub release (optional)"
    echo ""
  fi
}

# Run main
main
