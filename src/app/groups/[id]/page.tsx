'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { groupsAPI, bookingsAPI, roomsAPI, guestsAPI } from '@/lib/api';

export default function GroupDetailPage() {
  const params = useParams();
  const router = useRouter();
  const groupId = params.id as string;
  
  const [group, setGroup] = useState<any>(null);
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [newBooking, setNewBooking] = useState({
    roomId: '',
    guestId: '',
    checkIn: '',
    checkOut: '',
    occupancyType: 'double',
    mealCookedBreakfast: false,
    mealContinentalBreakfast: false,
    mealPackedLunch: false,
    mealCost: 0,
    manualDiscount: 0,
  });

  useEffect(() => {
    loadData();
  }, [groupId]);

  async function loadData() {
    try {
      const [groupData, roomsData, guestsData] = await Promise.all([
        groupsAPI.getOne(groupId),
        roomsAPI.getAll(),
        guestsAPI.getAll(),
      ]);
      setGroup(groupData);
      setRooms(roomsData);
      setGuests(guestsData);
    } catch (error: any) {
      console.error('Error loading group:', error);
      alert('Error loading group: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBooking(e: React.FormEvent) {
    e.preventDefault();
    try {
      await bookingsAPI.create({
        ...newBooking,
        groupId,
      });
      setShowBookingForm(false);
      setNewBooking({
        roomId: '',
        guestId: '',
        checkIn: '',
        checkOut: '',
        occupancyType: 'double',
        mealCookedBreakfast: false,
        mealContinentalBreakfast: false,
        mealPackedLunch: false,
        mealCost: 0,
        manualDiscount: 0,
      });
      loadData();
    } catch (error: any) {
      alert('Error creating booking: ' + error.message);
    }
  }

  async function handleDeleteBooking(bookingId: string) {
    if (!confirm('Delete this booking?')) return;
    try {
      await bookingsAPI.delete(bookingId);
      loadData();
    } catch (error: any) {
      alert('Error deleting booking: ' + error.message);
    }
  }

  async function handleDeleteGroup() {
    if (!confirm('Delete this entire group and all bookings?')) return;
    try {
      await groupsAPI.delete(groupId);
      router.push('/groups');
    } catch (error: any) {
      alert('Error deleting group: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600">Loading...</p>
        </main>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600">Group not found</p>
        </main>
      </div>
    );
  }

  const bookings = group.roomBookings || [];
  const mealSummary = {
    cooked: bookings.filter((b: any) => b.mealCookedBreakfast).length,
    continental: bookings.filter((b: any) => b.mealContinentalBreakfast).length,
    packed: bookings.filter((b: any) => b.mealPackedLunch).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <Link href="/bookings" className="text-sm text-blue-600 hover:text-blue-800 mb-2 inline-block">
              ← Back to Bookings
            </Link>
            <h1 className="text-3xl font-bold text-slate-900">{group.groupName}</h1>
            {group.notes && (
              <p className="text-slate-600 mt-2">{group.notes}</p>
            )}
          </div>
          <button onClick={handleDeleteGroup} className="btn-secondary text-red-600 hover:bg-red-50">
            Delete Group
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card">
            <h3 className="text-sm font-medium text-slate-600 mb-1">Total Rooms</h3>
            <p className="text-3xl font-bold text-blue-600">{group.totalRoomsBooked || 0}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-slate-600 mb-1">Group Discount</h3>
            <p className="text-3xl font-bold text-orange-600">£{group.groupDiscountAmount?.toFixed(2) || '0.00'}</p>
          </div>
          <div className="card">
            <h3 className="text-sm font-medium text-slate-600 mb-1">Grand Total</h3>
            <p className="text-3xl font-bold text-green-600">£{group.grandTotal?.toFixed(2) || '0.00'}</p>
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Breakfast Summary</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-slate-600">Cooked Breakfast</p>
              <p className="text-2xl font-bold text-blue-600">{mealSummary.cooked}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Continental</p>
              <p className="text-2xl font-bold text-green-600">{mealSummary.continental}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Packed Lunch</p>
              <p className="text-2xl font-bold text-orange-600">{mealSummary.packed}</p>
            </div>
          </div>
        </div>

        <div className="card mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-slate-900">Room Bookings</h2>
            <button onClick={() => setShowBookingForm(!showBookingForm)} className="btn-primary">
              {showBookingForm ? 'Cancel' : 'Add Booking'}
            </button>
          </div>

          {showBookingForm && (
            <form onSubmit={handleAddBooking} className="bg-slate-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Room *</label>
                  <select
                    required
                    className="input"
                    value={newBooking.roomId}
                    onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })}
                  >
                    <option value="">Select room...</option>
                    {rooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name} (£{room.singleRate}/£{room.doubleRate})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Guest</label>
                  <select
                    className="input"
                    value={newBooking.guestId}
                    onChange={(e) => setNewBooking({ ...newBooking, guestId: e.target.value })}
                  >
                    <option value="">Select guest (optional)...</option>
                    {guests.map((guest) => (
                      <option key={guest.id} value={guest.id}>
                        {guest.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="label">Check-in *</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={newBooking.checkIn}
                    onChange={(e) => setNewBooking({ ...newBooking, checkIn: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Check-out *</label>
                  <input
                    type="date"
                    required
                    className="input"
                    value={newBooking.checkOut}
                    onChange={(e) => setNewBooking({ ...newBooking, checkOut: e.target.value })}
                  />
                </div>

                <div>
                  <label className="label">Occupancy Type *</label>
                  <select
                    className="input"
                    value={newBooking.occupancyType}
                    onChange={(e) => setNewBooking({ ...newBooking, occupancyType: e.target.value })}
                  >
                    <option value="single">Single</option>
                    <option value="double">Double</option>
                  </select>
                </div>

                <div>
                  <label className="label">Manual Discount (£)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="input"
                    value={newBooking.manualDiscount}
                    onChange={(e) => setNewBooking({ ...newBooking, manualDiscount: parseFloat(e.target.value) || 0 })}
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="label">Meals</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newBooking.mealCookedBreakfast}
                        onChange={(e) => setNewBooking({ ...newBooking, mealCookedBreakfast: e.target.checked })}
                      />
                      Cooked Breakfast
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newBooking.mealContinentalBreakfast}
                        onChange={(e) => setNewBooking({ ...newBooking, mealContinentalBreakfast: e.target.checked })}
                      />
                      Continental
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={newBooking.mealPackedLunch}
                        onChange={(e) => setNewBooking({ ...newBooking, mealPackedLunch: e.target.checked })}
                      />
                      Packed Lunch
                    </label>
                  </div>
                </div>
              </div>
              <button type="submit" className="btn-primary mt-4">
                Add Booking
              </button>
            </form>
          )}

          {bookings.length === 0 ? (
            <p className="text-slate-600 text-center py-8">No bookings yet. Click "Add Booking" to get started.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Room</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Dates</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Occupancy</th>
                    <th className="text-left py-3 px-4 font-semibold text-slate-700">Meals</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Total</th>
                    <th className="text-right py-3 px-4 font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map((booking: any) => (
                    <tr key={booking.id} className="border-b border-slate-100">
                      <td className="py-3 px-4">
                        <div className="font-medium">{booking.room?.name}</div>
                        {booking.guest && (
                          <div className="text-sm text-slate-600 mt-1">{booking.guest.name}</div>
                        )}
                        {booking.secondGuest && (
                          <div className="text-sm text-slate-600">{booking.secondGuest.name}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600">
                        {new Date(booking.checkIn).toLocaleDateString()} → {new Date(booking.checkOut).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-sm">{booking.occupancyType}</td>
                      <td className="py-3 px-4 text-sm">
                        {booking.mealCookedBreakfast && '🍳 '}
                        {booking.mealContinentalBreakfast && '🥐 '}
                        {booking.mealPackedLunch && '🥪 '}
                      </td>
                      <td className="py-3 px-4 text-right font-semibold">£{booking.total?.toFixed(2)}</td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/bookings/edit/${booking.id}`}
                          className="text-sm text-blue-600 hover:text-blue-800 mr-4"
                        >
                          Edit
                        </Link>
                        <button
                          onClick={() => handleDeleteBooking(booking.id)}
                          className="text-sm text-red-600 hover:text-red-800"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
