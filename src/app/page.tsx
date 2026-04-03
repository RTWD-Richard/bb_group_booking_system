'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Calendar from '@/components/Calendar';
import { bookingsAPI, roomsAPI, guestsAPI } from '@/lib/api';

export default function Dashboard() {
  const [stats, setStats] = useState({
    checkInsToday: 0,
    checkOutsToday: 0,
    roomsNeedCleaning: 0,
  });
  const [bookings, setBookings] = useState<any[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [guests, setGuests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [bookingsData, roomsData, guestsData] = await Promise.all([
        bookingsAPI.getAll(),
        roomsAPI.getAll(),
        guestsAPI.getAll(),
      ]);

      setBookings(bookingsData);
      setRooms(roomsData);
      setGuests(guestsData);

      // Count check-ins today
      const checkInsToday = bookingsData.filter((b: any) => {
        const checkIn = new Date(b.checkIn);
        checkIn.setHours(0, 0, 0, 0);
        return checkIn.getTime() === today.getTime();
      }).length;

      // Count check-outs today
      const checkOutsToday = bookingsData.filter((b: any) => {
        const checkOut = new Date(b.checkOut);
        checkOut.setHours(0, 0, 0, 0);
        return checkOut.getTime() === today.getTime();
      }).length;

      // Count rooms needing cleaning
      const roomsNeedCleaning = roomsData.filter((r: any) => r.housekeepingStatus === 'dirty').length;

      setStats({
        checkInsToday,
        checkOutsToday,
        roomsNeedCleaning,
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navigation />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-center text-slate-600">Loading dashboard...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Dashboard</h1>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Today&apos;s Check-ins</h2>
            <p className="text-3xl font-bold text-blue-600">{stats.checkInsToday}</p>
            <p className="text-sm text-slate-500 mt-2">
              {stats.checkInsToday === 0 ? 'No check-ins scheduled' : `${stats.checkInsToday} guest${stats.checkInsToday > 1 ? 's' : ''} arriving`}
            </p>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Today&apos;s Check-outs</h2>
            <p className="text-3xl font-bold text-green-600">{stats.checkOutsToday}</p>
            <p className="text-sm text-slate-500 mt-2">
              {stats.checkOutsToday === 0 ? 'No check-outs scheduled' : `${stats.checkOutsToday} guest${stats.checkOutsToday > 1 ? 's' : ''} departing`}
            </p>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Rooms Need Cleaning</h2>
            <p className="text-3xl font-bold text-orange-600">{stats.roomsNeedCleaning}</p>
            <p className="text-sm text-slate-500 mt-2">
              {stats.roomsNeedCleaning === 0 ? 'All rooms clean' : `${stats.roomsNeedCleaning} room${stats.roomsNeedCleaning > 1 ? 's' : ''} need attention`}
            </p>
            {stats.roomsNeedCleaning > 0 && (
              <Link href="/housekeeping" className="text-sm text-blue-600 hover:text-blue-800 mt-2 inline-block">
                View Housekeeping →
              </Link>
            )}
          </div>
        </div>

        {/* Calendar View */}
        <div className="card mb-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Booking Calendar</h2>
          <Calendar bookings={bookings} rooms={rooms} guests={guests} compact={false} />
        </div>

        {/* Quick Actions */}
        <div className="text-center">
          <p className="text-slate-600 mb-4">Ready to create a booking?</p>
          <div className="flex gap-4 justify-center">
            <Link href="/bookings/new" className="btn-primary inline-block">
              Create Individual Booking
            </Link>
            <Link href="/groups/new" className="btn-secondary inline-block">
              Create Group Booking
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
