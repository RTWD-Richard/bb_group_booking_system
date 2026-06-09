'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { bookingsAPI, roomsAPI, guestsAPI, groupsAPI } from '@/lib/api';
import { calculateDeposit, DepositMode } from '@/lib/deposit';

export default function EditBooking() {
  const params = useParams();
  const router = useRouter();
  const bookingId = params.id as string;

  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

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
  const [booking, setBooking] = useState<any>(null);
  const [formData, setFormData] = useState({
    roomId: '',
    checkIn: '',
    checkOut: '',
    occupancyType: 'double' as 'single' | 'double',
    mealCookedBreakfast: false,
    mealContinentalBreakfast: false,
    mealPackedLunch: false,
    mealCost: 0,
    manualDiscount: 0,
    depositAmount: 0,
    depositPaid: false,
    balancePaid: false,
    paymentNotes: '',
  });

  // Deposit (manual entry or percentage)
  const [depositMode, setDepositMode] = useState<DepositMode>('amount');
  const [depositPercentage, setDepositPercentage] = useState(20);

  useEffect(() => {
    loadData();
  }, [bookingId]);

  async function loadData() {
    try {
      const [bookingData, roomsData, guestsData, groupsData] = await Promise.all([
        bookingsAPI.getOne(bookingId),
        roomsAPI.getAll(),
        guestsAPI.getAll(),
        groupsAPI.getAll(),
      ]);
      
      setBooking(bookingData);
      setRooms(roomsData);
      setGuests(guestsData);
      setGroups(groupsData);
      
      // Pre-populate form with booking data
      setSelectedGuestId(bookingData.guestId);
      setSelectedSecondGuestId(bookingData.secondGuestId || '');
      setFormData({
        roomId: bookingData.roomId,
        checkIn: bookingData.checkIn.split('T')[0], // Convert to YYYY-MM-DD
        checkOut: bookingData.checkOut.split('T')[0],
        occupancyType: bookingData.occupancyType,
        mealCookedBreakfast: bookingData.mealCookedBreakfast || false,
        mealContinentalBreakfast: bookingData.mealContinentalBreakfast || false,
        mealPackedLunch: bookingData.mealPackedLunch || false,
        mealCost: bookingData.mealCost || 0,
        manualDiscount: bookingData.manualDiscount || 0,
        depositAmount: bookingData.depositAmount || 0,
        depositPaid: bookingData.depositPaid || false,
        balancePaid: bookingData.balancePaid || false,
        paymentNotes: bookingData.paymentNotes || '',
      });
    } catch (error: any) {
      alert('Error loading booking: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Calculate standard price based on room, occupancy, and dates
  function calculateStandardPrice() {
    if (!formData.roomId || !formData.checkIn || !formData.checkOut) return 0;
    
    const selectedRoom = rooms.find(r => r.id === formData.roomId);
    if (!selectedRoom) return 0;

    const checkIn = new Date(formData.checkIn);
    const checkOut = new Date(formData.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    if (nights <= 0) return 0;

    const ratePerNight = formData.occupancyType === 'single' 
      ? selectedRoom.singleRate 
      : selectedRoom.doubleRate;
    
    return (ratePerNight * nights) + formData.mealCost - formData.manualDiscount;
  }

  const getDepositAmount = () => calculateDeposit({
    total: calculateStandardPrice(),
    mode: depositMode,
    amount: formData.depositAmount,
    percentage: depositPercentage,
  });

  function getBalanceDue() {
    return calculateStandardPrice() - getDepositAmount();
  }

  async function handleCreateGuest() {
    try {
      const created = await guestsAPI.create(newGuest);
      setGuests([...guests, created]);
      setSelectedGuestId(created.id);
      setGuestMode('existing');
      setNewGuest({ name: '', email: '', phone: '', dietaryRequirements: '' });
    } catch (error: any) {
      alert('Error creating guest: ' + error.message);
    }
  }

  async function handleCreateSecondGuest() {
    try {
      const created = await guestsAPI.create(newSecondGuest);
      setGuests([...guests, created]);
      setSelectedSecondGuestId(created.id);
      setSecondGuestMode('existing');
      setNewSecondGuest({ name: '', email: '', phone: '', dietaryRequirements: '' });
    } catch (error: any) {
      alert('Error creating second guest: ' + error.message);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!selectedGuestId) {
      alert('Please select or create a guest');
      return;
    }

    setSubmitting(true);
    try {
      // Create second guest if needed
      let secondGuestId = selectedSecondGuestId;
      if (formData.occupancyType === 'double' && secondGuestMode === 'new' && newSecondGuest.name) {
        const created = await guestsAPI.create(newSecondGuest);
        secondGuestId = created.id;
      }

      const updateData = {
        ...formData,
        guestId: selectedGuestId,
        secondGuestId: formData.occupancyType === 'double' ? secondGuestId : null,
        depositAmount: getDepositAmount(),
      };

      await bookingsAPI.update(bookingId, updateData);
      router.push(`/groups/${booking.groupId}`);
    } catch (error: any) {
      alert('Error updating booking: ' + error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Loading...</p>
        </main>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p>Booking not found</p>
        </main>
      </div>
    );
  }

  const finalPrice = calculateStandardPrice();
  const depositAmount = getDepositAmount();
  const balanceDue = getBalanceDue();

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <Link href={`/groups/${booking.groupId}`} className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Booking
          </Link>
        </div>

        <h1 className="text-3xl font-bold text-slate-900 mb-8">Edit Booking</h1>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Guest Selection */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Guest Information</h2>
            
            <div className="mb-4">
              <div className="flex gap-4 mb-4">
                <button
                  type="button"
                  onClick={() => setGuestMode('existing')}
                  className={`px-4 py-2 rounded ${guestMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  Select Existing Guest
                </button>
                <button
                  type="button"
                  onClick={() => setGuestMode('new')}
                  className={`px-4 py-2 rounded ${guestMode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  Create New Guest
                </button>
              </div>

              {guestMode === 'existing' ? (
                <div>
                  <label className="label">Guest *</label>
                  <select
                    required
                    className="input"
                    value={selectedGuestId}
                    onChange={(e) => setSelectedGuestId(e.target.value)}
                  >
                    <option value="">Select a guest...</option>
                    {guests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.name} {guest.email && `(${guest.email})`}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="space-y-4">
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
                    <textarea
                      className="input"
                      rows={2}
                      value={newGuest.dietaryRequirements}
                      onChange={(e) => setNewGuest({ ...newGuest, dietaryRequirements: e.target.value })}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleCreateGuest}
                    className="btn-secondary"
                  >
                    Save & Select Guest
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Second Guest (for double occupancy) */}
          {formData.occupancyType === 'double' && (
            <div className="card">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Second Guest (Optional)</h2>
              
              <div className="mb-4">
                <div className="flex gap-4 mb-4">
                  <button
                    type="button"
                    onClick={() => setSecondGuestMode('existing')}
                    className={`px-4 py-2 rounded ${secondGuestMode === 'existing' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    Select Existing Guest
                  </button>
                  <button
                    type="button"
                    onClick={() => setSecondGuestMode('new')}
                    className={`px-4 py-2 rounded ${secondGuestMode === 'new' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                  >
                    Create New Guest
                  </button>
                </div>

                {secondGuestMode === 'existing' ? (
                  <div>
                    <label className="label">Second Guest</label>
                    <select
                      className="input"
                      value={selectedSecondGuestId}
                      onChange={(e) => setSelectedSecondGuestId(e.target.value)}
                    >
                      <option value="">Select a guest (optional)...</option>
                      {guests.map((guest) => (
                        <option key={guest.id} value={guest.id}>
                          {guest.name} {guest.email && `(${guest.email})`}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-4">
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
                      <textarea
                        className="input"
                        rows={2}
                        value={newSecondGuest.dietaryRequirements}
                        onChange={(e) => setNewSecondGuest({ ...newSecondGuest, dietaryRequirements: e.target.value })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleCreateSecondGuest}
                      className="btn-secondary"
                    >
                      Save & Select Second Guest
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Booking Details */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Booking Details</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Room *</label>
                <select
                  required
                  className="input"
                  value={formData.roomId}
                  onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                >
                  <option value="">Select a room...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} - Single: £{room.singleRate} / Double: £{room.doubleRate}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Occupancy Type *</label>
                <select
                  required
                  className="input"
                  value={formData.occupancyType}
                  onChange={(e) => setFormData({ ...formData, occupancyType: e.target.value as 'single' | 'double' })}
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
                  value={formData.checkIn}
                  onChange={(e) => setFormData({ ...formData, checkIn: e.target.value })}
                />
              </div>

              <div>
                <label className="label">Check-out Date *</label>
                <input
                  type="date"
                  required
                  className="input"
                  value={formData.checkOut}
                  onChange={(e) => setFormData({ ...formData, checkOut: e.target.value })}
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
                  checked={formData.mealCookedBreakfast}
                  onChange={(e) => setFormData({ ...formData, mealCookedBreakfast: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Cooked Breakfast</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.mealContinentalBreakfast}
                  onChange={(e) => setFormData({ ...formData, mealContinentalBreakfast: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Continental Breakfast</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.mealPackedLunch}
                  onChange={(e) => setFormData({ ...formData, mealPackedLunch: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Packed Lunch</span>
              </label>
            </div>

            <div>
              <label className="label">Total Meal Cost (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={formData.mealCost}
                onChange={(e) => setFormData({ ...formData, mealCost: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>

          {/* Pricing & Deposit */}
          <div className="card">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">Pricing & Payment</h2>
            
            <div className="mb-4">
              <label className="label">Manual Discount (£)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={formData.manualDiscount}
                onChange={(e) => setFormData({ ...formData, manualDiscount: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <div className="bg-slate-100 p-4 rounded-lg mb-4">
              <div className="text-2xl font-bold text-slate-900">
                Total: £{finalPrice.toFixed(2)}
              </div>
            </div>

            <div className="mb-4">
              <label className="label">Deposit</label>
              <div className="flex gap-4 mb-3">
                <button
                  type="button"
                  onClick={() => setDepositMode('percentage')}
                  className={`px-4 py-2 rounded ${depositMode === 'percentage' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  Percentage
                </button>
                <button
                  type="button"
                  onClick={() => setDepositMode('amount')}
                  className={`px-4 py-2 rounded ${depositMode === 'amount' ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-700'}`}
                >
                  Fixed Amount
                </button>
              </div>

              {depositMode === 'percentage' ? (
                <div>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="1"
                    className="input"
                    value={depositPercentage}
                    onChange={(e) => setDepositPercentage(parseFloat(e.target.value) || 0)}
                    placeholder="Percentage"
                  />
                  <p className="text-sm text-slate-600 mt-1">
                    Deposit Amount: £{depositAmount.toFixed(2)} ({finalPrice > 0 ? ((depositAmount / finalPrice) * 100).toFixed(1) : depositPercentage}%)
                  </p>
                </div>
              ) : (
                <div>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input"
                    value={formData.depositAmount}
                    onChange={(e) => setFormData({ ...formData, depositAmount: parseFloat(e.target.value) || 0 })}
                    placeholder="Amount"
                  />
                  <p className="text-sm text-slate-600 mt-1">
                    Deposit: £{depositAmount.toFixed(2)} ({finalPrice > 0 ? ((depositAmount / finalPrice) * 100).toFixed(1) : 0}%)
                  </p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-lg">
                <strong>Balance Due:</strong> £{balanceDue.toFixed(2)}
              </div>
            </div>

            <div className="mt-4 space-y-3">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.depositPaid}
                  onChange={(e) => setFormData({ ...formData, depositPaid: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Deposit Paid</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.balancePaid}
                  onChange={(e) => setFormData({ ...formData, balancePaid: e.target.checked })}
                  className="w-4 h-4"
                />
                <span>Balance Paid</span>
              </label>
            </div>

            <div className="mt-4">
              <label className="label">Payment Notes</label>
              <textarea
                className="input"
                rows={2}
                value={formData.paymentNotes}
                onChange={(e) => setFormData({ ...formData, paymentNotes: e.target.value })}
                placeholder="Optional notes about payment..."
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1"
            >
              {submitting ? 'Updating...' : 'Update Booking'}
            </button>
            <Link href={`/groups/${booking.groupId}`} className="btn-secondary">
              Cancel
            </Link>
          </div>
        </form>
      </main>
    </div>
  );
}
