'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { bookingsAPI, roomsAPI, guestsAPI, groupsAPI, settingsAPI } from '@/lib/api';

export default function NewIndividualBooking() {
  const router = useRouter();
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Group selection
  const [groupMode, setGroupMode] = useState<'existing' | 'new'>('existing');
  const [selectedGroupId, setSelectedGroupId] = useState('');

  // Guest selection or creation
  const [guestMode, setGuestMode] = useState<'existing' | 'new'>('existing');
  const [selectedGuestId, setSelectedGuestId] = useState('');
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    dietaryRequirements: '',
  });

  // Second guest (for double occupancy)
  const [secondGuestMode, setSecondGuestMode] = useState<'existing' | 'new'>('existing');
  const [selectedSecondGuestId, setSelectedSecondGuestId] = useState('');
  const [newSecondGuest, setNewSecondGuest] = useState({
    name: '',
    email: '',
    phone: '',
    dietaryRequirements: '',
  });

  // Booking details
  const [booking, setBooking] = useState({
    roomId: '',
    checkIn: '',
    checkOut: '',
    occupancyType: 'double' as 'single' | 'double',
    mealCookedBreakfast: false,
    mealContinentalBreakfast: false,
    mealPackedLunch: false,
    mealCost: 0,
    manualDiscount: 0,
    notes: '',
  });

  // Pricing
  const [pricingMode, setPricingMode] = useState<'standard' | 'custom'>('standard');
  const [customPrice, setCustomPrice] = useState(0);
  
  // Deposit (manual entry or percentage)
  const [depositMode, setDepositMode] = useState<'amount' | 'percentage'>('percentage');
  const [depositAmount, setDepositAmount] = useState(0);
  const [depositPercentage, setDepositPercentage] = useState(20);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [roomsData, guestsData, groupsData] = await Promise.all([
        roomsAPI.getAll(),
        guestsAPI.getAll(),
        groupsAPI.getAll(),
      ]);
      setRooms(roomsData);
      setGuests(guestsData);
      setGroups(groupsData);
    } catch (error: any) {
      alert('Error loading data: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate standard price based on room, occupancy, and dates
  function calculateStandardPrice() {
    if (!booking.roomId || !booking.checkIn || !booking.checkOut) return 0;
    
    const selectedRoom = rooms.find(r => r.id === booking.roomId);
    if (!selectedRoom) return 0;

    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return 0;

    const ratePerNight = booking.occupancyType === 'single' 
      ? selectedRoom.singleRate 
      : selectedRoom.doubleRate;
    
    return (ratePerNight * nights) + booking.mealCost - booking.manualDiscount;
  }

  function getFinalPrice() {
    return pricingMode === 'custom' ? customPrice : calculateStandardPrice();
  }

  function getDepositAmount() {
    if (depositMode === 'amount') {
      return depositAmount;
    } else {
      const total = getFinalPrice();
      return (total * depositPercentage) / 100;
    }
  }

  function calculateBalance() {
    return getFinalPrice() - getDepositAmount();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Step 1: Get or create guest
      let guestId = selectedGuestId;
      if (guestMode === 'new') {
        const createdGuest = await guestsAPI.create(newGuest);
        guestId = createdGuest.id;
      }

      if (!guestId) {
        alert('Please select or create a guest');
        setSubmitting(false);
        return;
      }

      // Step 1b: Get or create second guest (for double occupancy)
      let secondGuestId = selectedSecondGuestId;
      if (booking.occupancyType === 'double' && secondGuestMode === 'new' && newSecondGuest.name) {
        const createdSecondGuest = await guestsAPI.create(newSecondGuest);
        secondGuestId = createdSecondGuest.id;
      }

      // Step 2: Get or create group
      let groupId = selectedGroupId;
      if (groupMode === 'new' || !groupId) {
        const guest = guestMode === 'new' 
          ? newGuest 
          : guests.find(g => g.id === guestId);
        
        const group = await groupsAPI.create({
          groupName: `Individual - ${guest?.name || 'Guest'}`,
          groupDiscountAmount: 0,
          notes: booking.notes || 'Individual booking',
        });
        groupId = group.id;
      }

      // Step 3: Create the booking
      await bookingsAPI.create({
        groupId,
        roomId: booking.roomId,
        guestId,
        secondGuestId: booking.occupancyType === 'double' ? secondGuestId : null,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        occupancyType: booking.occupancyType,
        mealCookedBreakfast: booking.mealCookedBreakfast,
        mealContinentalBreakfast: booking.mealContinentalBreakfast,
        mealPackedLunch: booking.mealPackedLunch,
        mealCost: booking.mealCost,
        manualDiscount: booking.manualDiscount,
        depositAmount: getDepositAmount(),
        depositPaid: false,
        balancePaid: false,
      });

      router.push(`/groups/${groupId}`);
    } catch (error: any) {
      alert('Error creating booking: ' + error.message);
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-600">Loading...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Create Individual Booking</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Selection */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Add to Group (Optional)</h2>
            
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setGroupMode('new')}
                className={`px-4 py-2 rounded ${
                  groupMode === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Create New Group
              </button>
              <button
                type="button"
                onClick={() => setGroupMode('existing')}
                className={`px-4 py-2 rounded ${
                  groupMode === 'existing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Add to Existing Group
              </button>
            </div>

            {groupMode === 'existing' && (
              <div>
                <label className="label">Select Group</label>
                <select
                  className="input"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                >
                  <option value="">None (Create individual booking)</option>
                  {groups
                    .filter((group) => !group.groupName.startsWith('Individual -'))
                    .map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.groupName} ({group.totalRoomsBooked || 0} rooms)
                      </option>
                    ))}
                </select>
                <p className="text-sm text-slate-500 mt-1">
                  Leave blank to create a standalone individual booking
                </p>
              </div>
            )}

            {groupMode === 'new' && (
              <p className="text-sm text-slate-600">
                A new group will be created automatically for this booking
              </p>
            )}
          </div>

          {/* Guest Selection */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Guest Information</h2>
            
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setGuestMode('existing')}
                className={`px-4 py-2 rounded ${
                  guestMode === 'existing'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Existing Guest
              </button>
              <button
                type="button"
                onClick={() => setGuestMode('new')}
                className={`px-4 py-2 rounded ${
                  guestMode === 'new'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                New Guest
              </button>
            </div>

            {guestMode === 'existing' ? (
              <div>
                <label className="label">Select Guest *</label>
                <select
                  required
                  className="input"
                  value={selectedGuestId}
                  onChange={(e) => setSelectedGuestId(e.target.value)}
                >
                  <option value="">Choose a guest</option>
                  {guests.map((guest) => (
                    <option key={guest.id} value={guest.id}>
                      {guest.name} {guest.email ? `(${guest.email})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    required
                    className="input"
                    value={newGuest.name}
                    onChange={(e) => setNewGuest({ ...newGuest, name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    className="input"
                    value={newGuest.email}
                    onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Phone</label>
                  <input
                    type="tel"
                    className="input"
                    value={newGuest.phone}
                    onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Dietary Requirements</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g., Vegetarian, Gluten-free"
                    value={newGuest.dietaryRequirements}
                    onChange={(e) => setNewGuest({ ...newGuest, dietaryRequirements: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Second Guest (for double occupancy) */}
          {booking.occupancyType === 'double' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Second Guest (Optional)</h2>
              
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setSecondGuestMode('existing')}
                  className={`px-4 py-2 rounded ${
                    secondGuestMode === 'existing'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  Existing Guest
                </button>
                <button
                  type="button"
                  onClick={() => setSecondGuestMode('new')}
                  className={`px-4 py-2 rounded ${
                    secondGuestMode === 'new'
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  New Guest
                </button>
              </div>

              {secondGuestMode === 'existing' ? (
                <div>
                  <label className="label">Select Second Guest</label>
                  <select
                    className="input"
                    value={selectedSecondGuestId}
                    onChange={(e) => setSelectedSecondGuestId(e.target.value)}
                  >
                    <option value="">Choose a guest (optional)</option>
                    {guests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.name} {guest.email ? `(${guest.email})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input
                      type="text"
                      className="input"
                      value={newSecondGuest.name}
                      onChange={(e) => setNewSecondGuest({ ...newSecondGuest, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={newSecondGuest.email}
                      onChange={(e) => setNewSecondGuest({ ...newSecondGuest, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input
                      type="tel"
                      className="input"
                      value={newSecondGuest.phone}
                      onChange={(e) => setNewSecondGuest({ ...newSecondGuest, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Dietary Requirements</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g., Vegetarian, Gluten-free"
                      value={newSecondGuest.dietaryRequirements}
                      onChange={(e) => setNewSecondGuest({ ...newSecondGuest, dietaryRequirements: e.target.value })}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Room & Dates */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Booking Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Room *</label>
                <select
                  required
                  className="input"
                  value={booking.roomId}
                  onChange={(e) => setBooking({ ...booking, roomId: e.target.value })}
                >
                  <option value="">Choose a room</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - Single £{room.singleRate}, Double £{room.doubleRate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Occupancy Type *</label>
                <select
                  required
                  className="input"
                  value={booking.occupancyType}
                  onChange={(e) => setBooking({ ...booking, occupancyType: e.target.value as 'single' | 'double' })}
                >
                  <option value="single">Single</option>
                  <option value="double">Double</option>
                </select>
              </div>

              <div>
                <label className="label">Check-in Date *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={booking.checkIn}
                  onChange={(e) => setBooking({ ...booking, checkIn: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Check-out Date *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={booking.checkOut}
                  onChange={(e) => setBooking({ ...booking, checkOut: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Meals */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Meal Options</h2>
            
            <div className="space-y-3 mb-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={booking.mealCookedBreakfast}
                  onChange={(e) => setBooking({ ...booking, mealCookedBreakfast: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700">Cooked Breakfast</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={booking.mealContinentalBreakfast}
                  onChange={(e) => setBooking({ ...booking, mealContinentalBreakfast: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700">Continental Breakfast</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={booking.mealPackedLunch}
                  onChange={(e) => setBooking({ ...booking, mealPackedLunch: e.target.checked })}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-slate-700">Packed Lunch</span>
              </label>
            </div>

            <div>
              <label className="label">Meal Cost (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={booking.mealCost}
                onChange={(e) => setBooking({ ...booking, mealCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Pricing</h2>
            
            <div className="flex gap-4 mb-4">
              <button
                type="button"
                onClick={() => setPricingMode('standard')}
                className={`px-4 py-2 rounded ${
                  pricingMode === 'standard'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Standard Rate
              </button>
              <button
                type="button"
                onClick={() => setPricingMode('custom')}
                className={`px-4 py-2 rounded ${
                  pricingMode === 'custom'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                }`}
              >
                Custom Price
              </button>
            </div>

            {pricingMode === 'standard' ? (
              <div className="space-y-4">
                <div className="bg-slate-50 p-4 rounded border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Total Price</div>
                  <div className="text-2xl font-bold text-slate-900">
                    £{calculateStandardPrice().toFixed(2)}
                  </div>
                  {booking.roomId && booking.checkIn && booking.checkOut && (
                    <div className="text-xs text-slate-500 mt-2">
                      {(() => {
                        const room = rooms.find(r => r.id === booking.roomId);
                        if (!room) return '';
                        const nights = Math.ceil(
                          (new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / 
                          (1000 * 60 * 60 * 24)
                        );
                        const rate = booking.occupancyType === 'single' ? room.singleRate : room.doubleRate;
                        return `£${rate} × ${nights} night${nights !== 1 ? 's' : ''} + £${booking.mealCost} meals - £${booking.manualDiscount} discount`;
                      })()}
                    </div>
                  )}
                </div>

                <div>
                  <label className="label">Discount (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={booking.manualDiscount}
                    onChange={(e) => setBooking({ ...booking, manualDiscount: parseFloat(e.target.value) || 0 })}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Applied to the calculated total above
                  </p>
                </div>

                {/* Deposit Entry */}
                <div className="space-y-4">
                  <div>
                    <label className="label">Deposit Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="depositMode"
                          checked={depositMode === 'percentage'}
                          onChange={() => setDepositMode('percentage')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700">Percentage (%)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="depositMode"
                          checked={depositMode === 'amount'}
                          onChange={() => setDepositMode('amount')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700">Fixed Amount (£)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Deposit Amount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="input"
                        value={depositPercentage}
                        onChange={(e) => setDepositPercentage(parseFloat(e.target.value) || 0)}
                        disabled={depositMode === 'amount'}
                      />
                      {depositMode === 'percentage' && (
                        <p className="text-xs text-slate-500 mt-1">
                          = £{getDepositAmount().toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label">Deposit Amount (£)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Enter amount"
                        disabled={depositMode === 'percentage'}
                      />
                      {depositMode === 'amount' && depositAmount > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          = {((depositAmount / getFinalPrice()) * 100).toFixed(1)}% of total
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                {(getDepositAmount() > 0) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Payment Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total:</span>
                        <span className="font-semibold text-slate-900">£{getFinalPrice().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Deposit:</span>
                        <span className="font-semibold text-green-700">£{getDepositAmount().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-2">
                        <span className="text-slate-600">Balance Due:</span>
                        <span className="font-semibold text-orange-700">£{calculateBalance().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="label">Custom Total Price (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    className="input"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                    placeholder="Enter custom price"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Override the standard rate calculation with a custom amount
                  </p>
                </div>

                {/* Deposit Entry */}
                <div className="space-y-4">
                  <div>
                    <label className="label">Deposit Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="depositMode"
                          checked={depositMode === 'percentage'}
                          onChange={() => setDepositMode('percentage')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700">Percentage (%)</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="radio"
                          name="depositMode"
                          checked={depositMode === 'amount'}
                          onChange={() => setDepositMode('amount')}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-slate-700">Fixed Amount (£)</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="label">Deposit Amount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="1"
                        className="input"
                        value={depositPercentage}
                        onChange={(e) => setDepositPercentage(parseFloat(e.target.value) || 0)}
                        disabled={depositMode === 'amount'}
                      />
                      {depositMode === 'percentage' && customPrice > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          = £{getDepositAmount().toFixed(2)}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="label">Deposit Amount (£)</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Enter amount"
                        disabled={depositMode === 'percentage'}
                      />
                      {depositMode === 'amount' && depositAmount > 0 && customPrice > 0 && (
                        <p className="text-xs text-slate-500 mt-1">
                          = {((depositAmount / customPrice) * 100).toFixed(1)}% of total
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Payment Breakdown */}
                {customPrice > 0 && getDepositAmount() > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-slate-900 mb-3">Payment Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Total:</span>
                        <span className="font-semibold text-slate-900">£{customPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Deposit:</span>
                        <span className="font-semibold text-green-700">£{getDepositAmount().toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between border-t border-blue-300 pt-2">
                        <span className="text-slate-600">Balance Due:</span>
                        <span className="font-semibold text-orange-700">£{calculateBalance().toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="card">
            <label className="label">Notes</label>
            <textarea
              className="input"
              rows={3}
              placeholder="Any special requests or notes..."
              value={booking.notes}
              onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creating Booking...' : 'Create Booking'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
