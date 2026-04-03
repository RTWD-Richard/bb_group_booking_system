'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { bookingsAPI, roomsAPI, guestsAPI } from '@/lib/api';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [bookingsData, roomsData] = await Promise.all([
        bookingsAPI.getAll(),
        roomsAPI.getAll(),
      ]);
      
      // Enrich bookings with room info
      const enrichedBookings = bookingsData.map((booking: any) => {
        const room = roomsData.find((r: any) => r.id === booking.roomId);
        return { ...booking, room };
      });

      // Sort by check-in date (newest first)
      enrichedBookings.sort((a: any, b: any) => 
        new Date(b.checkIn).getTime() - new Date(a.checkIn).getTime()
      );

      setBookings(enrichedBookings);
      setRooms(roomsData);
    } catch (error: any) {
      alert('Error loading bookings: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function calculateNights(checkIn: string, checkOut: string) {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }

  function getBookingStatus(checkIn: string, checkOut: string) {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(checkIn);
    start.setHours(0, 0, 0, 0);
    const end = new Date(checkOut);
    end.setHours(0, 0, 0, 0);

    if (now < start) return { label: 'Upcoming', color: 'bg-blue-100 text-blue-800' };
    if (now >= start && now < end) return { label: 'Active', color: 'bg-green-100 text-green-800' };
    return { label: 'Completed', color: 'bg-slate-100 text-slate-600' };
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-600">Loading bookings...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">All Bookings</h1>
          <Link href="/bookings/new" className="btn-primary">
            Create Individual Booking
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600 mb-4">No bookings yet</p>
            <Link href="/bookings/new" className="btn-primary inline-block">
              Create First Booking
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => {
              const status = getBookingStatus(booking.checkIn, booking.checkOut);
              const nights = calculateNights(booking.checkIn, booking.checkOut);

              return (
                <div key={booking.id} className="card hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {booking.room?.name || 'Unknown Room'}
                        </h3>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${status.color}`}>
                          {status.label}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-slate-500">Check-in</p>
                          <p className="font-medium">{formatDate(booking.checkIn)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Check-out</p>
                          <p className="font-medium">{formatDate(booking.checkOut)}</p>
                        </div>
                        <div>
                          <p className="text-slate-500">Duration</p>
                          <p className="font-medium">{nights} night{nights !== 1 ? 's' : ''}</p>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm text-slate-600">
                        <span className="capitalize">{booking.occupancyType} occupancy</span>
                        {booking.mealCookedBreakfast && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                            Cooked Breakfast
                          </span>
                        )}
                        {booking.mealContinentalBreakfast && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs">
                            Continental
                          </span>
                        )}
                        {booking.mealPackedLunch && (
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                            Packed Lunch
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="text-right">
                      <Link 
                        href={`/groups/${booking.groupId}`}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        View Details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
