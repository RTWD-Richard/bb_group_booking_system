'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Calendar from '@/components/Calendar';
import { bookingsAPI, roomsAPI, guestsAPI } from '@/lib/api';

export default function CalendarPage() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [bookingsData, roomsData, guestsData] = await Promise.all([
        bookingsAPI.getAll(),
        roomsAPI.getAll(),
        guestsAPI.getAll(),
      ]);

      setBookings(bookingsData);
      setRooms(roomsData);
      setGuests(guestsData);
    } catch (error: any) {
      alert('Error loading calendar: ' + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-600">Loading calendar...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Booking Calendar</h1>
          <Link href="/bookings/new" className="btn-primary">
            Create Booking
          </Link>
        </div>

        {bookings.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600 mb-4">No bookings to display</p>
            <Link href="/bookings/new" className="btn-primary inline-block">
              Create First Booking
            </Link>
          </div>
        ) : (
          <div className="card">
            <Calendar bookings={bookings} rooms={rooms} guests={guests} compact={false} />
          </div>
        )}
      </main>
    </div>
  );
}
