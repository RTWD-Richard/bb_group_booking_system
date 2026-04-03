'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/Navigation';
import { groupsAPI } from '@/lib/api';

export default function NewGroupPage() {
  const router = useRouter();
  const [groupName, setGroupName] = useState('');
  const [notes, setNotes] = useState('');
  const [groupDiscount, setGroupDiscount] = useState(0);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      await groupsAPI.create({
        groupName,
        notes,
        groupDiscountAmount: groupDiscount,
      });
      router.push('/groups');
    } catch (error: any) {
      alert('Error creating group: ' + error.message);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-6">Create New Group</h1>

        <form onSubmit={handleSubmit} className="card">
          <div className="space-y-4">
            <div>
              <label className="label">Group Name *</label>
              <input
                type="text"
                required
                className="input"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Smith Wedding Party"
              />
            </div>

            <div>
              <label className="label">Group Discount (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                className="input"
                value={groupDiscount}
                onChange={(e) => setGroupDiscount(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="label">Notes</label>
              <textarea
                className="input"
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Special requests, contact information, etc."
              />
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
            >
              {loading ? 'Creating...' : 'Create Group'}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="btn-secondary"
            >
              Cancel
            </button>
          </div>

          <p className="text-sm text-slate-600 mt-4">
            After creating the group, you&apos;ll be able to add room bookings.
          </p>
        </form>
      </main>
    </div>
  );
}
