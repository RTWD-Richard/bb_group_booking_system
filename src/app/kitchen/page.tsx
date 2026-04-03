'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { bookingsAPI, roomsAPI } from '@/lib/api';

export default function KitchenReportPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Default to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setSelectedDate(tomorrow.toISOString().split('T')[0]);
    loadData();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadBookings();
    }
  }, [selectedDate]);

  async function loadData() {
    try {
      const roomsData = await roomsAPI.getAll();
      setRooms(roomsData);
      await loadBookings();
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function loadBookings() {
    if (!selectedDate) return;
    
    try {
      const date = new Date(selectedDate);
      const allBookings = await bookingsAPI.getAll();
      
      // Filter bookings that are active on selected date
      const filtered = allBookings.filter((booking: any) => {
        const checkIn = new Date(booking.checkIn);
        const checkOut = new Date(booking.checkOut);
        return checkIn <= date && checkOut > date;
      });
      
      setBookings(filtered);
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  }

  const totals = {
    cooked: bookings.filter((b: any) => b.mealCookedBreakfast).length,
    continental: bookings.filter((b: any) => b.mealContinentalBreakfast).length,
    packed: bookings.filter((b: any) => b.mealPackedLunch).length,
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Kitchen Report</h1>

        <div className="card mb-6">
          <label className="label">Select Date</label>
          <input
            type="date"
            className="input max-w-xs"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
        </div>

        {/* Breakfast Summary */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Breakfast Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-900">{totals.cooked}</div>
              <div className="text-sm text-orange-700">Cooked Breakfast</div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-900">{totals.continental}</div>
              <div className="text-sm text-yellow-700">Continental Breakfast</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-900">{totals.packed}</div>
              <div className="text-sm text-blue-700">Packed Lunch</div>
            </div>
          </div>
          {totals.cooked + totals.continental + totals.packed === 0 && (
            <p className="text-slate-500 text-sm mt-4">No meals scheduled for this date</p>
          )}
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading...</p>
          </div>
        ) : (
          <>
            <div className="card mb-6">
              <h2 className="text-xl font-semibold text-slate-900 mb-4">Summary</h2>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Cooked Breakfast</p>
                  <p className="text-3xl font-bold text-blue-600">{totals.cooked}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Continental Breakfast</p>
                  <p className="text-3xl font-bold text-green-600">{totals.continental}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Packed Lunch</p>
                  <p className="text-3xl font-bold text-orange-600">{totals.packed}</p>
                </div>
              </div>
            </div>

            {bookings.length === 0 ? (
              <div className="card text-center py-12">
                <p className="text-slate-600">No meals scheduled for this date</p>
              </div>
            ) : (
              <div className="card">
                <h2 className="text-xl font-semibold text-slate-900 mb-4">Meal Details</h2>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Room</th>
                        <th className="text-left py-3 px-4 font-semibold text-slate-700">Guest</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Cooked</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Continental</th>
                        <th className="text-center py-3 px-4 font-semibold text-slate-700">Packed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking: any) => {
                        const room = rooms.find(r => r.id === booking.roomId);
                        return (
                          <tr key={booking.id} className="border-b border-slate-100">
                            <td className="py-3 px-4">{room?.name || 'Unknown'}</td>
                            <td className="py-3 px-4 text-slate-600">Guest</td>
                            <td className="py-3 px-4 text-center">
                              {booking.mealCookedBreakfast ? '✓' : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {booking.mealContinentalBreakfast ? '✓' : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {booking.mealPackedLunch ? '✓' : '—'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
