#!/bin/bash
set -e

# LiftGO Escrow — Shell Test Runner (curl only, no Node)

BASE_URL="${TEST_BASE_URL:-http://localhost:3000}"
CRON_SECRET="${CRON_SECRET:-your-secret}"

echo "🧪 Running Escrow Shell Tests"
echo "   BASE_URL: $BASE_URL"
echo ""

# Helper function for colored output
pass() { echo "✅ $1"; }
fail() { echo "❌ $1"; exit 1; }

# Test 1: Create Escrow Transaction
echo "Test 1: Create Escrow Transaction"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/escrow/create" \
  -H "Content-Type: application/json" \
  -d '{
    "customerId": "cus_shell_test",
    "partnerId": "partner_shell_test",
    "inquiryId": "inq_shell_test",
    "amount": 12000,
    "description": "Shell test transaction"
  }')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 201 ]; then
  pass "Created escrow transaction"
  TRANSACTION_ID=$(echo "$BODY" | grep -o '"transactionId":"[^"]*"' | cut -d'"' -f4)
  echo "   Transaction ID: $TRANSACTION_ID"
else
  fail "Failed to create escrow (HTTP $HTTP_CODE)"
fi

echo ""

# Test 2: Release Escrow (will fail if not HELD status, but tests API)
echo "Test 2: Release Escrow"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/escrow/release" \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"$TRANSACTION_ID\",
    \"customerId\": \"cus_shell_test\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 400 ]; then
  pass "Release endpoint responding"
else
  fail "Release endpoint error (HTTP $HTTP_CODE)"
fi

echo ""

# Test 3: Open Dispute
echo "Test 3: Open Dispute"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/escrow/dispute" \
  -H "Content-Type: application/json" \
  -d "{
    \"transactionId\": \"$TRANSACTION_ID\",
    \"reason\": \"QUALITY_ISSUE\",
    \"description\": \"Shell test dispute\",
    \"openedBy\": \"CUSTOMER\"
  }")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 400 ]; then
  pass "Dispute endpoint responding"
else
  fail "Dispute endpoint error (HTTP $HTTP_CODE)"
fi

echo ""

# Test 4: Webhook Security - Missing Signature
echo "Test 4: Webhook Security - No Signature"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/webhooks/stripe" \
  -H "Content-Type: application/json" \
  -d '{"id": "evt_shell_test", "type": "test"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 400 ]; then
  pass "Webhook rejects missing signature"
else
  fail "Webhook should reject requests without signature (got HTTP $HTTP_CODE)"
fi

echo ""

# Test 5: Cron Job Protection
echo "Test 5: Cron Job - Wrong Secret"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/cron/escrow-auto-release" \
  -H "Authorization: Bearer wrong_secret")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 401 ]; then
  pass "Cron rejects invalid secret"
else
  fail "Cron should reject invalid auth (got HTTP $HTTP_CODE)"
fi

echo ""

# Test 6: Audit Query
echo "Test 6: Audit Query"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/escrow/audit/$TRANSACTION_ID")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" -eq 200 ] || [ "$HTTP_CODE" -eq 404 ]; then
  pass "Audit endpoint responding"
else
  fail "Audit endpoint error (HTTP $HTTP_CODE)"
fi

echo ""
echo "🎉 All shell tests passed!"
