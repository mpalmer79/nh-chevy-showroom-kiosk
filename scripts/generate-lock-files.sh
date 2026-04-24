#!/bin/bash
# =============================================================================
# NH CHEVY SHOWROOM KIOSK - Generate Package Lock Files
# Run this locally to create deterministic package-lock.json files
# =============================================================================
# Usage: ./scripts/generate-lock-files.sh
# =============================================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║     Generating package-lock.json for deterministic builds  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Generate frontend package-lock.json
echo "📦 Generating frontend/package-lock.json..."
cd "$ROOT_DIR/frontend"

# Remove existing lock file and node_modules to ensure clean generation
rm -f package-lock.json
rm -rf node_modules

# Generate lock file only (doesn't install to node_modules)
npm install --package-lock-only

if [ -f "package-lock.json" ]; then
    echo -e "${GREEN}✓${NC} frontend/package-lock.json generated"
else
    echo "✗ Failed to generate frontend/package-lock.json"
    exit 1
fi

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Package lock files generated successfully!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Next steps:"
echo "  1. Review the generated package-lock.json"
echo "  2. Commit it to your repository:"
echo "     git add frontend/package-lock.json"
echo "     git commit -m 'Add package-lock.json for deterministic builds'"
echo "  3. Push to trigger deployment"
echo ""
