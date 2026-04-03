#!/bin/bash
# Test script for critical functionality: pricing and availability

BASE_URL="http://localhost:8888/api"

echo "🧪 Testing B&B Booking System"
echo "================================"
echo ""

# Get first room ID
echo "📋 Step 1: Getting room information..."
ROOM_RESPONSE=$(curl -s "$BASE_URL/rooms")
ROOM_ID=$(echo $ROOM_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")
ROOM_NAME=$(echo $ROOM_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['name'])")
SINGLE_RATE=$(echo $ROOM_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['singleRate'])")
DOUBLE_RATE=$(echo $ROOM_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['doubleRate'])")

echo "  ✓ Room: $ROOM_NAME"
echo "  ✓ Single rate: £$SINGLE_RATE, Double rate: £$DOUBLE_RATE"
echo ""

# Create a test group
echo "📋 Step 2: Creating test group..."
GROUP_RESPONSE=$(curl -s -X POST "$BASE_URL/groups" \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Test Group",
    "groupDiscountAmount": 0,
    "notes": "Automated test group"
  }')
GROUP_ID=$(echo $GROUP_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "  ✓ Group created: $GROUP_ID"
echo ""

# Create a guest
echo "📋 Step 3: Creating test guest..."
GUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/guests" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Test",
    "email": "john@test.com",
    "phone": "1234567890"
  }')
GUEST_ID=$(echo $GUEST_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "  ✓ Guest created: $GUEST_ID"
echo ""

# Test 1: Create a booking and verify pricing calculation
echo "🧮 Test 1: Pricing Calculation"
echo "--------------------------------"
echo "Creating booking: 3 nights, double occupancy, £20 meals, £10 discount"
BOOKING1=$(curl -s -X POST "$BASE_URL/room-bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "'$GROUP_ID'",
    "roomId": "'$ROOM_ID'",
    "guestId": "'$GUEST_ID'",
    "checkIn": "2026-01-10",
    "checkOut": "2026-01-13",
    "occupancyType": "double",
    "mealCost": 20,
    "manualDiscount": 10
  }')

echo "$BOOKING1" | python3 -c "
import sys, json
try:
    booking = json.load(sys.stdin)
    if 'error' in booking:
        print('  ❌ Error:', booking['error'])
    else:
        total = booking.get('calculatedTotal', 0)
        # Expected: (120 * 3) + 20 - 10 = 370
        expected = ($DOUBLE_RATE * 3) + 20 - 10
        if total == expected:
            print(f'  ✅ PASSED: Total £{total} matches expected £{expected}')
        else:
            print(f'  ❌ FAILED: Got £{total}, expected £{expected}')
        print(f'     Formula: (£$DOUBLE_RATE/night × 3 nights) + £20 meals - £10 discount = £{total}')
except Exception as e:
    print('  ❌ Error parsing response:', e)
"

BOOKING1_ID=$(echo $BOOKING1 | python3 -c "import sys, json; r = json.load(sys.stdin); print(r.get('id', ''))")
echo ""

# Test 2: Try to create overlapping booking (should fail)
echo "🚫 Test 2: Availability Check - Overlapping Dates"
echo "---------------------------------------------------"
echo "Attempting to book same room for overlapping dates (should fail)..."
BOOKING2=$(curl -s -X POST "$BASE_URL/room-bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "'$GROUP_ID'",
    "roomId": "'$ROOM_ID'",
    "guestId": "'$GUEST_ID'",
    "checkIn": "2026-01-12",
    "checkOut": "2026-01-15",
    "occupancyType": "single"
  }')

echo "$BOOKING2" | python3 -c "
import sys, json
try:
    resp = json.load(sys.stdin)
    if 'error' in resp and 'not available' in resp.get('error', '').lower():
        print('  ✅ PASSED: Correctly rejected overlapping booking')
        print(f'     Message: {resp[\"error\"]}')
    elif 'id' in resp:
        print('  ❌ FAILED: Should have rejected overlapping booking but accepted it')
    else:
        print('  ❌ FAILED: Unexpected response:', resp)
except Exception as e:
    print('  ❌ Error parsing response:', e)
"
echo ""

# Test 3: Create non-overlapping booking (should succeed)
echo "✅ Test 3: Availability Check - Non-overlapping Dates"
echo "-------------------------------------------------------"
echo "Creating booking for different dates (should succeed)..."
BOOKING3=$(curl -s -X POST "$BASE_URL/room-bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "'$GROUP_ID'",
    "roomId": "'$ROOM_ID'",
    "guestId": "'$GUEST_ID'",
    "checkIn": "2026-01-20",
    "checkOut": "2026-01-22",
    "occupancyType": "single",
    "mealCost": 0,
    "manualDiscount": 0
  }')

echo "$BOOKING3" | python3 -c "
import sys, json
try:
    booking = json.load(sys.stdin)
    if 'id' in booking:
        total = booking.get('calculatedTotal', 0)
        expected = $SINGLE_RATE * 2
        if total == expected:
            print(f'  ✅ PASSED: Booking created, total £{total} correct')
        else:
            print(f'  ⚠️  WARNING: Booking created but total £{total} != expected £{expected}')
    else:
        print('  ❌ FAILED:', booking.get('error', 'Unknown error'))
except Exception as e:
    print('  ❌ Error parsing response:', e)
"

BOOKING3_ID=$(echo $BOOKING3 | python3 -c "import sys, json; r = json.load(sys.stdin); print(r.get('id', ''))")
echo ""

# Test 4: Group total calculation
echo "💰 Test 4: Group Total Calculation"
echo "------------------------------------"
GROUP_DETAIL=$(curl -s "$BASE_URL/groups/$GROUP_ID")
echo "$GROUP_DETAIL" | python3 -c "
import sys, json
try:
    group = json.load(sys.stdin)
    if 'error' not in group:
        total = group.get('grandTotal', 0)
        bookings_count = len(group.get('bookings', []))
        print(f'  ✓ Group has {bookings_count} bookings')
        print(f'  ✓ Grand total: £{total}')
        # Should be sum of booking1 (370) + booking3 (160) = 530
        expected = (($DOUBLE_RATE * 3) + 20 - 10) + ($SINGLE_RATE * 2)
        if total == expected:
            print(f'  ✅ PASSED: Group total matches sum of bookings')
        else:
            print(f'  ⚠️  Check: Expected £{expected} based on manual calculation')
    else:
        print('  ❌ Error fetching group:', group['error'])
except Exception as e:
    print('  ❌ Error:', e)
"
echo ""

# Cleanup
echo "🧹 Cleanup: Deleting test data..."
if [ ! -z "$BOOKING1_ID" ]; then
    curl -s -X DELETE "$BASE_URL/room-bookings/$BOOKING1_ID" > /dev/null
fi
if [ ! -z "$BOOKING3_ID" ]; then
    curl -s -X DELETE "$BASE_URL/room-bookings/$BOOKING3_ID" > /dev/null
fi
curl -s -X DELETE "$BASE_URL/groups/$GROUP_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/guests/$GUEST_ID" > /dev/null
echo "  ✓ Test data cleaned up"
echo ""

echo "================================"
echo "✨ Testing complete!"
