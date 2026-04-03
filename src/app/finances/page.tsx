'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { bookingsAPI, roomsAPI, guestsAPI, groupsAPI } from '@/lib/api';

export default function FinancesPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [bookingsData, roomsData, guestsData, groupsData] = await Promise.all([
        bookingsAPI.getAll(),
        roomsAPI.getAll(),
        guestsAPI.getAll(),
        groupsAPI.getAll(),
      ]);
      setBookings(bookingsData);
      setRooms(roomsData);
      setGuests(guestsData);
      setGroups(groupsData);
    } catch (error: any) {
      alert('Error loading finances: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function getRoomName(roomId: string) {
    const room = rooms.find(r => r.id === roomId);
    return room?.name || 'Unknown Room';
  }

  function getGuestName(guestId: string | null) {
    if (!guestId) return 'Guest';
    const guest = guests.find(g => g.id === guestId);
    return guest?.name || 'Guest';
  }

  function getGroupName(groupId: string) {
    const group = groups.find(g => g.id === groupId);
    return group?.groupName || 'Unknown Group';
  }

  function calculateTotal(booking: any) {
    const room = rooms.find(r => r.id === booking.roomId);
    if (!room) return 0;

    const checkIn = new Date(booking.checkIn);
    const checkOut = new Date(booking.checkOut);
    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    
    const ratePerNight = booking.occupancyType === 'single' ? room.singleRate : room.doubleRate;
    const basePrice = ratePerNight * nights;
    
    return (basePrice + (booking.mealCost || 0)) - (booking.manualDiscount || 0);
  }

  function getPaymentStatus(booking: any) {
    const total = calculateTotal(booking);
    const deposit = booking.depositAmount || 0;
    const balance = total - deposit;

    if (booking.balancePaid) {
      return { label: 'Paid in Full', color: 'bg-green-100 text-green-800', priority: 3 };
    } else if (booking.depositPaid) {
      return { label: 'Deposit Paid', color: 'bg-yellow-100 text-yellow-800', priority: 2 };
    } else {
      return { label: 'Payment Pending', color: 'bg-red-100 text-red-800', priority: 1 };
    }
  }

  const filteredBookings = bookings.filter(booking => {
    const status = getPaymentStatus(booking);
    if (filter === 'paid') return status.priority === 3;
    if (filter === 'partial') return status.priority === 2;
    if (filter === 'pending') return status.priority === 1;
    return true;
  });

  // Calculate summary
  const summary = {
    totalRevenue: bookings.reduce((sum, b) => sum + calculateTotal(b), 0),
    depositsReceived: bookings.filter(b => b.depositPaid).reduce((sum, b) => sum + (b.depositAmount || 0), 0),
    balanceDue: bookings.filter(b => !b.balancePaid).reduce((sum, b) => {
      const total = calculateTotal(b);
      const deposit = b.depositPaid ? (b.depositAmount || 0) : 0;
      return sum + (total - deposit);
    }, 0),
  };

  async function toggleDepositPaid(bookingId: string, currentStatus: boolean) {
    try {
      await bookingsAPI.update(bookingId, { depositPaid: !currentStatus });
      loadData();
    } catch (error: any) {
      alert('Error updating payment status: ' + error.message);
    }
  }

  async function toggleBalancePaid(bookingId: string, currentStatus: boolean) {
    try {
      await bookingsAPI.update(bookingId, { balancePaid: !currentStatus });
      loadData();
    } catch (error: any) {
      alert('Error updating payment status: ' + error.message);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-600">Loading finances...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Finances</h1>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h3 className="text-sm text-slate-600 mb-1">Total Revenue</h3>
            <p className="text-2xl font-bold text-slate-900">£{summary.totalRevenue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">{bookings.length} bookings</p>
          </div>

          <div className="card">
            <h3 className="text-sm text-slate-600 mb-1">Deposits Received</h3>
            <p className="text-2xl font-bold text-green-600">£{summary.depositsReceived.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {bookings.filter(b => b.depositPaid).length} paid
            </p>
          </div>

          <div className="card">
            <h3 className="text-sm text-slate-600 mb-1">Balance Outstanding</h3>
            <p className="text-2xl font-bold text-orange-600">£{summary.balanceDue.toFixed(2)}</p>
            <p className="text-xs text-slate-500 mt-1">
              {bookings.filter(b => !b.balancePaid).length} pending
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            All ({bookings.length})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-4 py-2 rounded ${
              filter === 'pending'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Payment Pending
          </button>
          <button
            onClick={() => setFilter('partial')}
            className={`px-4 py-2 rounded ${
              filter === 'partial'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Deposit Paid
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-4 py-2 rounded ${
              filter === 'paid'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
            }`}
          >
            Paid in Full
          </button>
        </div>

        {/* Bookings Table */}
        <div className="card overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Guest</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Room</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-700">Dates</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Total</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Deposit</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-700">Balance</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Status</th>
                <th className="text-center py-3 px-4 text-sm font-semibold text-slate-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    No bookings found
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => {
                  const total = calculateTotal(booking);
                  const deposit = booking.depositAmount || 0;
                  const balance = total - deposit;
                  const status = getPaymentStatus(booking);

                  return (
                    <tr key={booking.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="text-sm font-medium text-slate-900">
                          {getGuestName(booking.guestId)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {getGroupName(booking.groupId)}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {getRoomName(booking.roomId)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-700">
                        {new Date(booking.checkIn).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        {' - '}
                        {new Date(booking.checkOut).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="py-3 px-4 text-right text-sm font-semibold text-slate-900">
                        £{total.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        <span className={booking.depositPaid ? 'text-green-700 font-semibold' : 'text-slate-600'}>
                          £{deposit.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right text-sm">
                        <span className={booking.balancePaid ? 'text-green-700 font-semibold' : 'text-orange-700 font-semibold'}>
                          £{balance.toFixed(2)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          {!booking.depositPaid && (
                            <button
                              onClick={() => toggleDepositPaid(booking.id, booking.depositPaid)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Mark deposit as paid"
                            >
                              Deposit ✓
                            </button>
                          )}
                          {booking.depositPaid && !booking.balancePaid && (
                            <button
                              onClick={() => toggleBalancePaid(booking.id, booking.balancePaid)}
                              className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                              title="Mark balance as paid"
                            >
                              Balance ✓
                            </button>
                          )}
                          {booking.balancePaid && (
                            <span className="text-xs text-green-700 font-medium">Completed</span>
                          )}
                          <Link
                            href={`/groups/${booking.groupId}`}
                            className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            View
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
