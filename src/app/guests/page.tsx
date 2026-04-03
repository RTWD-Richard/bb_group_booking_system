'use client';

import { useEffect, useState } from 'react';
import Navigation from '@/components/Navigation';
import { guestsAPI } from '@/lib/api';

export default function GuestsPage() {
  const [guests, setGuests] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newGuest, setNewGuest] = useState({
    name: '',
    email: '',
    phone: '',
    dietaryRequirements: '',
  });

  useEffect(() => {
    loadGuests();
  }, [search]);

  async function loadGuests() {
    try {
      const data = await guestsAPI.getAll(search);
      setGuests(data);
    } catch (error) {
      console.error('Error loading guests:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await guestsAPI.create(newGuest);
      setNewGuest({ name: '', email: '', phone: '', dietaryRequirements: '' });
      setShowForm(false);
      loadGuests();
    } catch (error: any) {
      alert('Error creating guest: ' + error.message);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-slate-900">Guests</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="btn-primary"
          >
            {showForm ? 'Cancel' : 'Add New Guest'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="card mb-6">
            <h2 className="text-xl font-semibold text-slate-900 mb-4">New Guest</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <input
                  type="text"
                  className="input"
                  value={newGuest.dietaryRequirements}
                  onChange={(e) => setNewGuest({ ...newGuest, dietaryRequirements: e.target.value })}
                  placeholder="e.g., Vegetarian, Gluten-free"
                />
              </div>
            </div>
            <button type="submit" className="btn-primary mt-4">
              Create Guest
            </button>
          </form>
        )}

        <div className="card mb-6">
          <input
            type="search"
            placeholder="Search guests by name or email..."
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-slate-600">Loading guests...</p>
          </div>
        ) : guests.length === 0 ? (
          <div className="card text-center py-12">
            <p className="text-slate-600">No guests found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {guests.map((guest) => (
              <div key={guest.id} className="card">
                <h3 className="font-semibold text-slate-900 mb-2">{guest.name}</h3>
                {guest.email && (
                  <p className="text-sm text-slate-600">{guest.email}</p>
                )}
                {guest.phone && (
                  <p className="text-sm text-slate-600">{guest.phone}</p>
                )}
                {guest.dietaryRequirements && (
                  <div className="mt-2 pt-2 border-t border-slate-200">
                    <p className="text-xs text-slate-500">Dietary:</p>
                    <p className="text-sm text-orange-600">{guest.dietaryRequirements}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
