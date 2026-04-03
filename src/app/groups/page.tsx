'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navigation from '@/components/Navigation';
import { groupsAPI } from '@/lib/api';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGroups();
  }, []);

  async function loadGroups() {
    try {
      const data = await groupsAPI.getAll();
      setGroups(data);
    } catch (error) {
      console.error('Error loading groups:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Groups & Events</h1>
          <Link href="/groups/new" className="btn-primary">
            Create New Group
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading groups...</p>
          </div>
        ) : groups.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600 mb-4">No groups found</p>
            <Link href="/groups/new" className="btn-primary inline-block">
              Create First Group
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <Link key={group.id} href={`/groups/${group.id}`} className="card block hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">{group.groupName}</h2>
                    <p className="text-sm text-slate-600 mt-1">
                      {group.totalRoomsBooked} room{group.totalRoomsBooked !== 1 ? 's' : ''} booked
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      £{group.grandTotal?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-slate-500">Total</p>
                  </div>
                </div>
                {group.notes && (
                  <p className="text-sm text-slate-600 mt-3">{group.notes}</p>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
