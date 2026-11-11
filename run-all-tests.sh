#!/bin/bash
# ========================================================================
#  GO7 MASTER TESTING SCRIPT (Linux/Mac)
#  This script runs all automated tests and provides testing guidance
# ========================================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

echo ""
echo -e "${CYAN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}${BOLD}║          GO7 COMPLETE TESTING SUITE                        ║${NC}"
echo -e "${CYAN}${BOLD}║          Master Test Execution Script                      ║${NC}"
echo -e "${CYAN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if server is running
echo -e "${BLUE}[1/5]${NC} Checking if development server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Server is running"
else
    echo ""
    echo -e "${YELLOW}⚠ WARNING:${NC} Development server is not running!"
    echo ""
    echo "Please start the server first:"
    echo "   npm run dev"
    echo ""
    echo "Then run this script again."
    exit 1
fi
echo ""

# Run automated tests
echo -e "${BLUE}[2/5]${NC} Running automated route tests..."
node automated-test-runner.js
if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}⚠${NC} Some automated tests failed. Check the output above."
    echo ""
else
    echo -e "${GREEN}✓${NC} All automated tests passed"
    echo ""
fi

# Open testing documentation
echo -e "${BLUE}[3/5]${NC} Test documentation available..."
echo -e "${GREEN}✓${NC} TEST_EXECUTION_GUIDE.md"
echo ""

# Open quick checklist
echo -e "${BLUE}[4/5]${NC} Quick checklist available..."
echo -e "${GREEN}✓${NC} QUICK_TEST_CHECKLIST.txt"
echo ""

# Application URL
echo -e "${BLUE}[5/5]${NC} Application ready..."
echo -e "${GREEN}✓${NC} http://localhost:3000"
echo ""

echo "════════════════════════════════════════════════════════════"
echo ""
echo -e "${GREEN}${BOLD}✅ TEST SETUP COMPLETE!${NC}"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Automated tests have run (check results above)"
echo "2. Open TEST_EXECUTION_GUIDE.md for comprehensive testing"
echo "3. Print QUICK_TEST_CHECKLIST.txt for manual testing"
echo "4. Open http://localhost:3000 in your browser"
echo ""
echo "MANUAL TESTING:"
echo "   - Follow QUICK_TEST_CHECKLIST.txt (60-70 minutes)"
echo "   - Check off each item as you test"
echo "   - Document any issues found"
echo ""
echo "COMPREHENSIVE TESTING:"
echo "   - Follow TEST_EXECUTION_GUIDE.md for detailed testing"
echo "   - Test all features systematically"
echo "   - Record results in the guide"
echo ""
echo -e "${CYAN}ADMIN CREDENTIALS:${NC}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo -e "${CYAN}TEST PAYMENT CARD:${NC}"
echo "   Card: 4084 0840 8408 4081"
echo "   CVV: 408"
echo "   Expiry: 01/30"
echo "   OTP: 123456"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""

# Show latest test results
echo "Latest test results:"
LATEST=$(ls -t test-results-*.json 2>/dev/null | head -n 1)
if [ -n "$LATEST" ]; then
    echo ""
    echo "File: $LATEST"
    echo ""
    cat "$LATEST" | head -n 20
    echo ""
    echo "... (see $LATEST for full results)"
else
    echo "No test results file found yet."
fi

echo ""
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}Testing session ready. Good luck!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
