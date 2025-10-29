#!/bin/bash

# Test script untuk Farcaster Discord Bot
# File: test.sh

echo "🧪 Testing Farcaster Discord Bot..."

# Test 1: Health check
echo "1. Testing health endpoint..."
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health)
if [ "$HEALTH_RESPONSE" = "200" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed (HTTP $HEALTH_RESPONSE)"
    exit 1
fi

# Test 2: Root endpoint
echo "2. Testing root endpoint..."
ROOT_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/)
if [ "$ROOT_RESPONSE" = "200" ]; then
    echo "✅ Root endpoint passed"
else
    echo "❌ Root endpoint failed (HTTP $ROOT_RESPONSE)"
    exit 1
fi

# Test 3: Webhook endpoint (without signature - should fail)
echo "3. Testing webhook endpoint without signature..."
WEBHOOK_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/webhook)
if [ "$WEBHOOK_RESPONSE" = "401" ]; then
    echo "✅ Webhook signature validation working"
else
    echo "❌ Webhook signature validation failed (HTTP $WEBHOOK_RESPONSE)"
    exit 1
fi

# Test 4: Invalid webhook payload
echo "4. Testing invalid webhook payload..."
INVALID_PAYLOAD='{"invalid": "payload"}'
INVALID_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -H "x-neynar-signature: sha256=invalid" \
  -d "$INVALID_PAYLOAD" \
  http://localhost:3000/webhook)
if [ "$INVALID_RESPONSE" = "401" ] || [ "$INVALID_RESPONSE" = "400" ]; then
    echo "✅ Invalid payload handling working"
else
    echo "❌ Invalid payload handling failed (HTTP $INVALID_RESPONSE)"
    exit 1
fi

echo "🎉 All tests passed!"
echo ""
echo "📝 Manual testing steps:"
echo "1. Start server: npm run dev"
echo "2. Setup ngrok: ngrok http 3000"
echo "3. Configure Neynar webhook with ngrok URL"
echo "4. Test with real Farcaster events"
echo ""
echo "🔗 Useful URLs:"
echo "- Health: http://localhost:3000/health"
echo "- Info: http://localhost:3000/"
echo "- Webhook: http://localhost:3000/webhook"
