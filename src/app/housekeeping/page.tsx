'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { roomsAPI } from '@/lib/api';

export default function HousekeepingPage() {
  const [rooms, setRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDirtyOnly, setShowDirtyOnly] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  async function loadRooms() {
    try {
      const data = await roomsAPI.getAll();
      setRooms(data);
    } catch (error) {
      console.error('Error loading rooms:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(roomId: string, currentStatus: string) {
    const newStatus = currentStatus === 'clean' ? 'dirty' : 'clean';
    try {
      await roomsAPI.update(roomId, { housekeepingStatus: newStatus });
      loadRooms();
    } catch (error: any) {
      alert('Error updating room: ' + error.message);
    }
  }

  const filteredRooms = showDirtyOnly ? rooms.filter(r => r.housekeepingStatus === 'dirty') : rooms;

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Housekeeping</h1>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={showDirtyOnly}
              onChange={(e) => setShowDirtyOnly(e.target.checked)}
              className="rounded"
            />
            Show only needs cleaning
          </label>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading rooms...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRooms.map((room) => (
              <div key={room.id} className="card">
                <h2 className="text-lg font-semibold text-slate-900 mb-2">{room.name}</h2>
                <div className="flex items-center justify-between">
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                    room.housekeepingStatus === 'clean'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-orange-100 text-orange-800'
                  }`}>
                    {room.housekeepingStatus === 'clean' ? '✓ Clean' : '⚠ Needs Cleaning'}
                  </span>
                  <button
                    onClick={() => toggleStatus(room.id, room.housekeepingStatus)}
                    className="btn-secondary text-sm"
                  >
                    Mark {room.housekeepingStatus === 'clean' ? 'Dirty' : 'Clean'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredRooms.length === 0 && !loading && (
          <div className="card text-center py-12">
            <p className="text-slate-600">
              {showDirtyOnly ? 'All rooms are clean!' : 'No rooms found'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
