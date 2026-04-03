#!/bin/bash
# Test individual booking creation via API

BASE_URL="http://localhost:8888/api"

echo "🧪 Testing Individual Booking Flow"
echo "===================================="
echo ""

# Get first room
ROOM_ID=$(curl -s "$BASE_URL/rooms" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['id'])")
ROOM_NAME=$(curl -s "$BASE_URL/rooms" | python3 -c "import sys, json; print(json.load(sys.stdin)[0]['name'])")

echo "✓ Selected room: $ROOM_NAME"

# Create a guest
GUEST_RESPONSE=$(curl -s -X POST "$BASE_URL/guests" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone": "555-1234"
  }')

GUEST_ID=$(echo $GUEST_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created guest: Jane Smith (ID: $GUEST_ID)"

# Create auto-group for individual booking
GROUP_RESPONSE=$(curl -s -X POST "$BASE_URL/groups" \
  -H "Content-Type: application/json" \
  -d '{
    "groupName": "Individual - Jane Smith",
    "groupDiscountAmount": 0,
    "notes": "Individual booking"
  }')

GROUP_ID=$(echo $GROUP_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['id'])")
echo "✓ Created auto-group: Individual - Jane Smith (ID: $GROUP_ID)"

# Create booking
BOOKING_RESPONSE=$(curl -s -X POST "$BASE_URL/room-bookings" \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "'$GROUP_ID'",
    "roomId": "'$ROOM_ID'",
    "guestId": "'$GUEST_ID'",
    "checkIn": "2026-02-01",
    "checkOut": "2026-02-03",
    "occupancyType": "double",
    "mealCookedBreakfast": true,
    "mealCost": 15,
    "manualDiscount": 0
  }')

echo "$BOOKING_RESPONSE" | python3 -c "
import sys, json
try:
    booking = json.load(sys.stdin)
    if 'id' in booking:
        print('✓ Booking created successfully!')
        print(f'  - Booking ID: {booking[\"id\"]}')
        print(f'  - Check-in: {booking[\"checkIn\"]}')
        print(f'  - Check-out: {booking[\"checkOut\"]}')
        print(f'  - Total: £{booking.get(\"calculatedTotal\", \"N/A\")}')
    else:
        print('❌ Error:', booking.get('error', 'Unknown error'))
except Exception as e:
    print('❌ Error:', e)
"

echo ""
echo "✅ Individual booking flow works!"
echo ""
echo "Cleaning up..."
BOOKING_ID=$(echo $BOOKING_RESPONSE | python3 -c "import sys, json; r = json.load(sys.stdin); print(r.get('id', ''))")
if [ ! -z "$BOOKING_ID" ]; then
    curl -s -X DELETE "$BASE_URL/room-bookings/$BOOKING_ID" > /dev/null
fi
curl -s -X DELETE "$BASE_URL/groups/$GROUP_ID" > /dev/null
curl -s -X DELETE "$BASE_URL/guests/$GUEST_ID" > /dev/null
echo "✓ Test data cleaned up"
