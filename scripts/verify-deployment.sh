#!/bin/bash
# Deployment Verification Script
# Usage: ./scripts/verify-deployment.sh [backend_url] [frontend_url]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default URLs (override with arguments)
BACKEND_URL="${1:-https://quirk-backend-production.up.railway.app}"
FRONTEND_URL="${2:-https://quirk-frontend-production.up.railway.app}"

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

check_pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    ((PASSED++))
}

check_fail() {
    echo -e "  ${RED}✗${NC} $1"
    ((FAILED++))
}

check_warn() {
    echo -e "  ${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

# Test HTTP endpoint
test_endpoint() {
    local url=$1
    local expected_status=${2:-200}
    local description=$3
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$url" 2>/dev/null || echo "000")
    
    if [ "$response" = "$expected_status" ]; then
        check_pass "$description (HTTP $response)"
        return 0
    else
        check_fail "$description (Expected $expected_status, got $response)"
        return 1
    fi
}

# Test JSON response contains key
test_json_key() {
    local url=$1
    local key=$2
    local description=$3
    
    response=$(curl -s --max-time 10 "$url" 2>/dev/null)
    
    if echo "$response" | grep -q "\"$key\""; then
        check_pass "$description"
        return 0
    else
        check_fail "$description (key '$key' not found)"
        return 1
    fi
}

# =============================================================================
# START VERIFICATION
# =============================================================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     QUIRK AI KIOSK - DEPLOYMENT VERIFICATION               ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Backend URL:  $BACKEND_URL"
echo "Frontend URL: $FRONTEND_URL"
echo "Timestamp:    $(date -u '+%Y-%m-%d %H:%M:%S UTC')"

# -----------------------------------------------------------------------------
# 1. BACKEND HEALTH CHECKS
# -----------------------------------------------------------------------------
print_header "1. BACKEND HEALTH CHECKS"

test_endpoint "$BACKEND_URL/" 200 "Root endpoint"
test_endpoint "$BACKEND_URL/api/health" 200 "Health check endpoint"
test_endpoint "$BACKEND_URL/api/health/live" 200 "Liveness probe"
test_endpoint "$BACKEND_URL/api/health/ready" 200 "Readiness probe"

# Check health response details
echo ""
echo "  Health check details:"
health_response=$(curl -s --max-time 10 "$BACKEND_URL/api/health" 2>/dev/null)

if echo "$health_response" | grep -q '"status":"healthy"'; then
    check_pass "Overall status: healthy"
elif echo "$health_response" | grep -q '"status":"degraded"'; then
    check_warn "Overall status: degraded (AI may be in fallback mode)"
else
    check_fail "Overall status: unhealthy or unreachable"
fi

if echo "$health_response" | grep -q '"ai_service"'; then
    if echo "$health_response" | grep -q '"status":"configured"'; then
        check_pass "AI Service: configured"
    else
        check_warn "AI Service: fallback mode (check ANTHROPIC_API_KEY)"
    fi
fi

if echo "$health_response" | grep -q '"inventory"'; then
    vehicle_count=$(echo "$health_response" | grep -o '"vehicle_count":[0-9]*' | grep -o '[0-9]*')
    if [ -n "$vehicle_count" ] && [ "$vehicle_count" -gt 0 ]; then
        check_pass "Inventory loaded: $vehicle_count vehicles"
    else
        check_warn "Inventory: 0 vehicles loaded"
    fi
fi

# -----------------------------------------------------------------------------
# 2. INVENTORY API
# -----------------------------------------------------------------------------
print_header "2. INVENTORY API"

test_endpoint "$BACKEND_URL/api/v1/inventory" 200 "Get inventory"
test_endpoint "$BACKEND_URL/api/v1/inventory/stats" 200 "Inventory stats"
test_endpoint "$BACKEND_URL/api/v1/inventory/models" 200 "Available models"
test_endpoint "$BACKEND_URL/api/v1/inventory/featured" 200 "Featured vehicles"

# Check inventory has vehicles
inv_response=$(curl -s --max-time 10 "$BACKEND_URL/api/v1/inventory" 2>/dev/null)
if echo "$inv_response" | grep -q '"total":[1-9]'; then
    total=$(echo "$inv_response" | grep -o '"total":[0-9]*' | grep -o '[0-9]*')
    check_pass "Inventory contains $total vehicles"
else
    check_fail "Inventory appears empty"
fi

# -----------------------------------------------------------------------------
# 3. AI V3 ENDPOINTS
# -----------------------------------------------------------------------------
print_header "3. AI V3 INTELLIGENT SYSTEM"

test_endpoint "$BACKEND_URL/api/v3/ai/health" 200 "V3 AI health check"

# Check V3 health details
v3_health=$(curl -s --max-time 10 "$BACKEND_URL/api/v3/ai/health" 2>/dev/null)

if echo "$v3_health" | grep -q '"api_key_configured":true'; then
    check_pass "Anthropic API key configured"
else
    check_warn "Anthropic API key NOT configured (will use fallback)"
fi

if echo "$v3_health" | grep -q '"retriever_fitted":true'; then
    check_pass "Semantic retriever fitted"
else
    check_warn "Semantic retriever not fitted yet"
fi

# Test AI chat endpoint (without actually sending a message)
echo ""
echo "  Testing AI chat endpoint structure..."
chat_test=$(curl -s -X POST "$BACKEND_URL/api/v3/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{"message":"test","session_id":"verify-test","conversation_history":[]}' \
    --max-time 30 2>/dev/null)

if echo "$chat_test" | grep -q '"message"'; then
    check_pass "AI chat endpoint responds"
else
    check_warn "AI chat endpoint may have issues"
fi

# -----------------------------------------------------------------------------
# 4. TRAFFIC & ANALYTICS
# -----------------------------------------------------------------------------
print_header "4. TRAFFIC & ANALYTICS"

test_endpoint "$BACKEND_URL/api/v1/traffic/stats" 200 "Traffic stats"
test_endpoint "$BACKEND_URL/api/v1/traffic/log?limit=1" 200 "Traffic log"

# -----------------------------------------------------------------------------
# 5. ADDITIONAL SERVICES
# -----------------------------------------------------------------------------
print_header "5. ADDITIONAL SERVICES"

test_endpoint "$BACKEND_URL/api/v1/tts/status" 200 "TTS status"
test_endpoint "$BACKEND_URL/api/v1/recommendations" 200 "Recommendations V1"
test_endpoint "$BACKEND_URL/api/v2/recommendations" 200 "Recommendations V2"

# -----------------------------------------------------------------------------
# 6. FRONTEND (if accessible)
# -----------------------------------------------------------------------------
print_header "6. FRONTEND"

frontend_status=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$FRONTEND_URL" 2>/dev/null || echo "000")

if [ "$frontend_status" = "200" ]; then
    check_pass "Frontend accessible (HTTP $frontend_status)"
    
    # Check if it's serving React app
    frontend_content=$(curl -s --max-time 10 "$FRONTEND_URL" 2>/dev/null)
    if echo "$frontend_content" | grep -q "root"; then
        check_pass "React app root element found"
    fi
else
    check_warn "Frontend not accessible at $FRONTEND_URL (HTTP $frontend_status)"
    echo "       This may be expected if frontend is on a different URL"
fi

# -----------------------------------------------------------------------------
# 7. CORS CHECK
# -----------------------------------------------------------------------------
print_header "7. CORS CONFIGURATION"

cors_response=$(curl -s -I -X OPTIONS "$BACKEND_URL/api/v1/inventory" \
    -H "Origin: $FRONTEND_URL" \
    -H "Access-Control-Request-Method: GET" \
    --max-time 10 2>/dev/null)

if echo "$cors_response" | grep -qi "access-control-allow"; then
    check_pass "CORS headers present"
else
    check_warn "CORS headers not detected (may need verification)"
fi

# -----------------------------------------------------------------------------
# 8. CRITICAL FLOW TEST
# -----------------------------------------------------------------------------
print_header "8. CRITICAL FLOW TEST"

echo "  Testing budget calculation flow..."

# Test Spanish language support in fallback
budget_test=$(curl -s -X POST "$BACKEND_URL/api/v3/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{
        "message": "I have $5000 down and want $500 monthly payments",
        "session_id": "verify-budget-test",
        "conversation_history": []
    }' \
    --max-time 45 2>/dev/null)

if echo "$budget_test" | grep -qi "budget\|price\|afford\|vehicle"; then
    check_pass "Budget calculation flow responds"
else
    check_warn "Budget calculation response unclear"
fi

echo ""
echo "  Testing Spanish language support..."

spanish_test=$(curl -s -X POST "$BACKEND_URL/api/v3/ai/chat" \
    -H "Content-Type: application/json" \
    -d '{
        "message": "Busco una camioneta para mi familia",
        "session_id": "verify-spanish-test",
        "conversation_history": []
    }' \
    --max-time 45 2>/dev/null)

if echo "$spanish_test" | grep -qi "camioneta\|familia\|vehículo\|silverado\|truck"; then
    check_pass "Spanish language support working"
else
    check_warn "Spanish response unclear (may still be working)"
fi

# =============================================================================
# SUMMARY
# =============================================================================
print_header "VERIFICATION SUMMARY"

echo ""
echo -e "  ${GREEN}Passed:${NC}   $PASSED"
echo -e "  ${RED}Failed:${NC}   $FAILED"
echo -e "  ${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✓ DEPLOYMENT VERIFICATION PASSED                          ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
elif [ $FAILED -le 2 ]; then
    echo -e "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${YELLOW}║  ⚠ DEPLOYMENT MOSTLY OK - Review warnings above            ║${NC}"
    echo -e "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ✗ DEPLOYMENT HAS ISSUES - Review failures above           ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════════════════════════╝${NC}"
    exit 1
fi
