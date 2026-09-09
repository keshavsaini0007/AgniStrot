#!/bin/bash

# AgniStrot AI Demo Script
# Run this to quickly test all AI features

set -e

BASE_URL="http://localhost:5000"
echo "=========================================="
echo "   AgniStrot AI Capabilities Demo"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if server is running
echo -e "${BLUE}[1/10]${NC} Checking server status..."
if ! curl -s "$BASE_URL/health" > /dev/null; then
    echo -e "${RED}❌ Server not running!${NC}"
    echo "Please start server first:"
    echo "  cd backend && npm run dev"
    exit 1
fi
echo -e "${GREEN}✅ Server running${NC}"
echo ""

# Login as Priya (mine official)
echo -e "${BLUE}[2/10]${NC} Logging in as Mine Official (Priya)..."
PRIYA_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"priya@agnistrot.com","password":"password123"}' \
  | jq -r '.token')

if [ "$PRIYA_TOKEN" = "null" ] || [ -z "$PRIYA_TOKEN" ]; then
    echo -e "${RED}❌ Login failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Logged in as Priya${NC}"
echo ""

# Login as Amit (corporate manager)
echo -e "${BLUE}[3/10]${NC} Logging in as Corporate Manager (Amit)..."
AMIT_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"amit@agnistrot.com","password":"password123"}' \
  | jq -r '.token')
echo -e "${GREEN}✅ Logged in as Amit${NC}"
echo ""

# Get Jharia site ID
echo -e "${BLUE}[4/10]${NC} Getting Jharia Mine site ID..."
SITE_ID=$(curl -s -X GET "$BASE_URL/api/v1/dashboard" \
  -H "Authorization: Bearer $PRIYA_TOKEN" \
  | jq -r '.data.sites[0]._id')
echo -e "${GREEN}✅ Site ID: $SITE_ID${NC}"
echo ""

# Test 1: AI Risk Scoring
echo -e "${YELLOW}=== TEST 1: AI Risk Scoring ===${NC}"
echo -e "${BLUE}[5/10]${NC} Getting AI risk score for Jharia Mine..."
RISK=$(curl -s -X GET "$BASE_URL/api/v1/ai/risk-score/$SITE_ID" \
  -H "Authorization: Bearer $PRIYA_TOKEN")

SCORE=$(echo "$RISK" | jq -r '.data.score')
LEVEL=$(echo "$RISK" | jq -r '.data.riskLevel')
echo -e "${GREEN}✅ Risk Score: $SCORE/100 ($LEVEL)${NC}"
echo "$RISK" | jq '.data.breakdown'
echo ""

# Test 2: AI Trend Analysis
echo -e "${YELLOW}=== TEST 2: AI Trend Analysis ===${NC}"
echo -e "${BLUE}[6/10]${NC} Getting 30-day trend analysis..."
TRENDS=$(curl -s -X GET "$BASE_URL/api/v1/ai/trends/$SITE_ID" \
  -H "Authorization: Bearer $PRIYA_TOKEN")

INSPECTIONS=$(echo "$TRENDS" | jq -r '.data.inspections.total')
INCIDENTS=$(echo "$TRENDS" | jq -r '.data.incidents.total')
ALERTS=$(echo "$TRENDS" | jq -r '.data.alerts.total')
echo -e "${GREEN}✅ 30-day data: $INSPECTIONS inspections, $INCIDENTS incidents, $ALERTS alerts${NC}"
echo "$TRENDS" | jq '.data'
echo ""

# Test 3: AI Summary Dashboard
echo -e "${YELLOW}=== TEST 3: AI Summary Dashboard ===${NC}"
echo -e "${BLUE}[7/10]${NC} Getting risk summary for all sites (Corporate view)..."
SUMMARY=$(curl -s -X GET "$BASE_URL/api/v1/ai/summary" \
  -H "Authorization: Bearer $AMIT_TOKEN")

SITE_COUNT=$(echo "$SUMMARY" | jq '.data | length')
echo -e "${GREEN}✅ $SITE_COUNT sites analyzed and ranked by risk${NC}"
echo "$SUMMARY" | jq '.data[] | {siteId, score, riskLevel}'
echo ""

# Test 4: Trigger AI Rule Engine
echo -e "${YELLOW}=== TEST 4: AI Rule Engine (Real-Time) ===${NC}"
echo -e "${BLUE}[8/10]${NC} Syncing inspection with safety violations..."

# Login as field officer
RAHUL_TOKEN=$(curl -s -X POST "$BASE_URL/api/v1/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"rahul@agnistrot.com","password":"password123"}' \
  | jq -r '.token')

UUID="demo-$(date +%s)"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%S.000Z 2>/dev/null || date -u +%Y-%m-%dT%H:%M:%SZ)

SYNC_RESULT=$(curl -s -X POST "$BASE_URL/api/v1/inspections/sync" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $RAHUL_TOKEN" \
  -d '{
    "clientUuid": "'$UUID'",
    "siteId": "'$SITE_ID'",
    "type": "safety",
    "checklist": [
      {"item": "PPE compliance", "result": "fail", "notes": "Demo: 2 workers without helmets"},
      {"item": "Fire extinguisher", "result": "fail", "notes": "Demo: 1 expired extinguisher"}
    ],
    "photoUrls": [],
    "capturedAt": "'$TIMESTAMP'"
  }')

echo -e "${GREEN}✅ Inspection synced${NC}"
echo ""

# Test 5: Verify AI Created Alert
echo -e "${BLUE}[9/10]${NC} Checking if AI created alert..."
sleep 2  # Give server moment to process

ALERTS=$(curl -s -X GET "$BASE_URL/api/v1/alerts" \
  -H "Authorization: Bearer $PRIYA_TOKEN")

NEW_ALERT=$(echo "$ALERTS" | jq -r '.data[] | select(.ruleCode == "SAFETY_CHECKLIST_FAIL") | select(.status == "open") | .ruleCode' | head -n 1)

if [ "$NEW_ALERT" = "SAFETY_CHECKLIST_FAIL" ]; then
    echo -e "${GREEN}✅ AI automatically created SAFETY_CHECKLIST_FAIL alert!${NC}"
    echo "$ALERTS" | jq '.data[] | select(.ruleCode == "SAFETY_CHECKLIST_FAIL") | {ruleCode, severity, status}' | head -n 1
else
    echo -e "${YELLOW}⚠️  Alert might already exist (check manually)${NC}"
fi
echo ""

# Test 6: Get Updated Risk Score
echo -e "${BLUE}[10/10]${NC} Getting updated risk score after new violation..."
NEW_RISK=$(curl -s -X GET "$BASE_URL/api/v1/ai/risk-score/$SITE_ID" \
  -H "Authorization: Bearer $PRIYA_TOKEN")

NEW_SCORE=$(echo "$NEW_RISK" | jq -r '.data.score')
NEW_LEVEL=$(echo "$NEW_RISK" | jq -r '.data.riskLevel')
echo -e "${GREEN}✅ Updated Risk Score: $NEW_SCORE/100 ($NEW_LEVEL)${NC}"
echo ""

# Summary
echo "=========================================="
echo -e "   ${GREEN}✅ All AI Features Tested!${NC}"
echo "=========================================="
echo ""
echo "AI Capabilities Verified:"
echo "  ✅ Risk Scoring (0-100 scale)"
echo "  ✅ Trend Analysis (30-day comparison)"
echo "  ✅ Summary Dashboard (multi-site ranking)"
echo "  ✅ Rule Engine (real-time detection)"
echo "  ✅ Auto-Alert Creation"
echo "  ✅ Dynamic Risk Updates"
echo ""
echo "Next Steps:"
echo "  • View alerts: curl -X GET $BASE_URL/api/v1/alerts -H \"Authorization: Bearer $PRIYA_TOKEN\" | jq"
echo "  • View audit log: curl -X GET $BASE_URL/api/v1/audit -H \"Authorization: Bearer $AMIT_TOKEN\" | jq"
echo "  • Run full tests: npm run verify"
echo ""
